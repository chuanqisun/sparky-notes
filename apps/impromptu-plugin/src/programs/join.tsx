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
    return `Joining with relation "${getFieldByLabel("Relation", node)!.value.characters}"...`;
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

      for (const valueNode of valueNodes) {
        const messages: ChatMessage[] = [
          {
            role: "system",
            content: `Help the user test if relationship exists between Text A and Text. First, respond with reason, then respond with Yes/No. e.g.
User: 
Text A: Food
Text B: Human
Relation: can be consumed by

You: 
Reason: Human eats food
Answer: Yes

User:
Text A: Page
Text B: Book
Relation: contains

You:
Reason: Page is contained by the Book, not the opposite
Answer: No`,
          },
          {
            role: "user",
            content: `
Text A: ${combineWhitespace(`${keyNode.text.characters} ${keyNode.getPluginData("shortContext")}`)}
Text B: ${combineWhitespace(`${valueNode.text.characters} ${valueNode.getPluginData("shortContext")}`)}
Relation: ${getFieldByLabel("Relation", node)!.value.characters}`,
          },
        ];

        replaceNotification(`Joining "${shortenToWordCount(5, keyNode.text.characters)}" with "${shortenToWordCount(5, valueNode.text.characters)}"`);
        const fullResponse = ((await context.chat(messages, { max_tokens: 500 })).choices[0].message.content ?? "").trim();

        if (context.isAborted() || context.isChanged()) return;

        if (fullResponse.match(/Answer\:\sYes/im)) {
          const combinedSticky = valueNode.clone();
          combinedSticky.text.characters = valueNode.text.characters;

          const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
          if (!targetSection) return;
          setFillColor(stickyColors.Yellow, combinedSticky);
          moveStickiesToSectionNoWrap([combinedSticky], targetSection);
        }
      }
    }
  }
}
