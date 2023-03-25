import { getCompletion } from "../openai/completion";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSectionNewLine, moveStickiesToSectionNoWrap, setFillColor } from "../utils/edit";
import { Description, FormTitle, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { combineWhitespace, shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class RelateProgram implements Program {
  public name = "relate";

  public getSummary(node: FrameNode) {
    return `Relating...`;
  }

  public getMethodology(_context: ProgramContext, node: FrameNode) {
    return `TBD`;
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
        const prompt = `
Read the Left-side text and the Right-side text. Answer the following question.

Left-side text: ${`${combineWhitespace(keyNode.text.characters)} ${keyNode.getPluginData("shortContext")}`.trim()}
Right-side text: ${`${combineWhitespace(valueNode.text.characters)} ${valueNode.getPluginData("shortContext")}`.trim()}

Question: Is the Left-side text highly related to the Right-side text?
Answer (Yes/No): `;

        replaceNotification(`Relating "${shortenToWordCount(5, keyNode.text.characters)}" with "${shortenToWordCount(5, valueNode.text.characters)}"`);
        const binaryAnswer = (await getCompletion(context.completion, prompt, { max_tokens: 3 })).choices[0].text.trim();

        if (context.isAborted() || context.isChanged()) return;

        if (binaryAnswer.toLocaleLowerCase().includes("no")) {
          const combinedSticky = figma.createSticky();
          combinedSticky.text.characters = `=== Right-side ===

${valueNode.text.characters}

=== Not related ===
`;

          const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
          if (!targetSection) return;
          setFillColor(stickyColors.LightGray, combinedSticky);
          moveStickiesToSectionNoWrap([combinedSticky], targetSection);
        } else {
          const followupPrompt = `
Read the Left-side text and the Right-side text. Answer the following question about the relations between the two texts.

Left-side text: ${`${combineWhitespace(keyNode.text.characters)} ${keyNode.getPluginData("shortContext")}`.trim()}
Right-side text: ${`${combineWhitespace(valueNode.text.characters)} ${valueNode.getPluginData("shortContext")}`.trim()}

Question: The Left-side text and Right-side text are highly related, what is the relation in short?
Answer: `;

          const fullAnswer = (await getCompletion(context.completion, followupPrompt, { max_tokens: 100 })).choices[0].text.trim();

          if (context.isAborted() || context.isChanged()) return;

          const combinedSticky = valueNode.clone();
          combinedSticky.text.characters = `=== Right-side ===

${valueNode.text.characters}

=== Related ===

${fullAnswer}`;

          const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
          if (!targetSection) return;
          setFillColor(stickyColors.Green, combinedSticky);
          moveStickiesToSectionNoWrap([combinedSticky], targetSection);
        }
      }
    }
  }
}
