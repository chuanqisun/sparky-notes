import { getMethodInputName } from "../hits/method-input";
import { ChatMessage } from "../openai/chat";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSectionNewLine, moveStickiesToSectionNoWrap, setFillColor } from "../utils/edit";
import { Description, FormTitle, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { combineWhitespace, shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class RelateProgram implements Program {
  public name = "relate";

  public getSummary(node: FrameNode) {
    return `Relating...`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Identify meaningful relations between items in the ${getMethodInputName(node)}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Relate</FormTitle>
        <Description>For each sticky in the left section, find meaningful relations to any sticky from the right section.</Description>
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Relate", node)!.locked = true;

    const sources = createOrUseSourceNodes(["Group A", "Group B"], context.selectedOutputNodes);
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
      replaceNotification("Relate requires 2 input sections");
      return;
    }

    const keyNodes = getInnerStickies(sources.slice(0, 1));

    const valueNodes = getInnerStickies(sources.slice(1, 2));

    for (const keyNode of keyNodes) {
      const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
      if (!targetSection) return;
      const newKeyNode = keyNode.clone();
      newKeyNode.text.characters = "=== Left-side ===\n\n" + newKeyNode.text.characters;
      setFillColor(stickyColors.Yellow, newKeyNode);
      moveStickiesToSectionNewLine([newKeyNode], targetSection);

      for (const valueNode of valueNodes) {
        replaceNotification(`Relating "${shortenToWordCount(5, keyNode.text.characters)}" with "${shortenToWordCount(5, valueNode.text.characters)}"`);

        const messages: ChatMessage[] = [
          {
            role: "system",
            content:
              'Identify logical relationship from a Subject to an Object. The user will provide Subject and Object. You will check if there exists a predicate relationship from Subject to Object. You will respond with the predicate relationship or "N/A" when there is no significant relationship',
          },
          {
            role: "user",
            content: `
Subject: Homeless problem in Seattle
Subject details: ...
Object: Racial justice for low income population
Object details: ...
    `,
          },
          { role: "assistant", content: "Homeless problem can be the result of the lack of Racial justice" },
          {
            role: "user",
            content: `
Subject: Homeless problem in Seattle
Subject details: ...
Object: Surfing is fun
Object details: ...
    `,
          },
          {
            role: "assistant",
            content: `N/A`,
          },
          {
            role: "user",
            content: `
Subject: Global warming
Subject details: ...
Object: Space travel
Object details: ...
    `,
          },
          {
            role: "assistant",
            content: `N/A
However, Global Warming and Space travel might be indirectly connected. The rocket fuel that Space travel consumes could be the cause of Global warming
            `,
          },
          {
            role: "user",
            content: `
Subject: ${combineWhitespace(`${keyNode.text.characters}`)}
Subject details: ${combineWhitespace(`${keyNode.getPluginData("shortContext")}`)}
Object: ${combineWhitespace(`${valueNode.text.characters}`)}
Object details: ${combineWhitespace(`${valueNode.getPluginData("shortContext")}`)}
    `,
          },
        ];

        const fullAnswer = (await context.chat(messages, { max_tokens: 300 })).choices[0].message.content?.trim() ?? "N/A";

        if (context.isAborted() || context.isChanged()) return;

        const isRealted = !fullAnswer.includes("N/A");

        const combinedSticky = valueNode.clone();
        combinedSticky.text.characters = `=== Right-side ===

${valueNode.text.characters}

${isRealted ? "=== Related ===" : "=== Not related==="}

${fullAnswer}`;

        const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
        if (!targetSection) return;
        setFillColor(isRealted ? stickyColors.Green : stickyColors.LightGray, combinedSticky);
        moveStickiesToSectionNoWrap([combinedSticky], targetSection);
      }
    }
  }
}
