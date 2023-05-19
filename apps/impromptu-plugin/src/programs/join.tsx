import { getMethodInputName } from "../hits/method-input";
import { ChatMessage } from "../openai/chat";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSectionNewLine, moveStickiesToSectionNoWrap, setFillColor } from "../utils/edit";
import { Description, FormTitle, TextField, getFieldByLabel, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { combineWhitespace, shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class JoinProgram implements Program {
  public name = "join";

  public getSummary(node: FrameNode) {
    return `Joining "${getFieldByLabel("Relation", node)!.value.characters}"...`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Identify "${getFieldByLabel("Relation", node)!.value.characters}" relations between items in the ${getMethodInputName(node)}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Join</FormTitle>
        <Description>
          For each sticky in the Left section, find stickies from the Right section such that the given relation holds true from the Left sticky to the Right
          sticky.
        </Description>
        <TextField label="Relation" value="can be solved by" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Join", node)!.locked = true;

    const sources = createOrUseSourceNodes(["Left", "Right"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const sources = context.sourceNodes.sort(sortLeftToRight);

    if (sources.length !== 2) {
      replaceNotification("Join requires 2 input sections");
      return;
    }

    const keyNodes = getInnerStickies(sources.slice(0, 1));

    const valueNodes = getInnerStickies(sources.slice(1, 2));

    for (const keyNode of keyNodes) {
      const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
      if (!targetSection) return;
      const newKeyNode = keyNode.clone();
      newKeyNode.text.characters = newKeyNode.text.characters;
      setFillColor(stickyColors.Green, newKeyNode);
      moveStickiesToSectionNewLine([newKeyNode], targetSection);

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: `Help the user test if a predicate holds true from a subject to the provided objects. Respond with matched objects in a valid json array. When there is no match, response with [].`,
        },
        {
          role: "user",
          content: `
Subject: Food
Predicate: can be consumed by
Objects:
1. Human
3. Car
4. Computer
5. Cat
6. Plants
`.trim(),
        },
        {
          role: "assistant",
          content: `[1,5]`,
        },
        {
          role: "user",
          content: `
Subject: Sun
Predicate: is bigger than
Objects:
1. Moon
2. Earth
3. Mars
`.trim(),
        },
        {
          role: "assistant",
          content: `[]`,
        },
        {
          role: "user",
          content: `
Subject: ${combineWhitespace(keyNode.text.characters)}
Predicate: ${getFieldByLabel("Relation", node)!.value.characters}
Object:
${valueNodes.map((valueNode, index) => `${index + 1}. ${combineWhitespace(`${valueNode.text.characters}`)}`).join("\n")}`.trim(),
        },
      ];

      replaceNotification(`Evaluting "${shortenToWordCount(5, keyNode.text.characters)} ${getFieldByLabel("Relation", node)!.value.characters}?"`, {
        timeout: Infinity,
      });
      const fullResponse = (
        (await context.chat(messages, { max_tokens: 500, temperature: 0.25, model: "v3.5-turbo" })).choices[0].message.content ?? ""
      ).trim();

      if (context.isAborted() || context.isChanged()) return;

      try {
        const answerPositions = JSON.parse(fullResponse.match(/(\[.*?\])/)?.[1] ?? "[]");
        const selectedValueNodes = answerPositions.map((position: number) => valueNodes[position - 1]).filter(Boolean);

        for (const valueNode of selectedValueNodes) {
          const combinedSticky = valueNode.clone();
          combinedSticky.text.characters = valueNode.text.characters;

          const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
          if (!targetSection) return;
          setFillColor(stickyColors.Yellow, combinedSticky);
          moveStickiesToSectionNoWrap([combinedSticky], targetSection);
        }
      } catch (e) {
        replaceNotification("Error joining stickies. Please adjust the relation and try again", { error: true });
        return;
      }
    }
  }
}
