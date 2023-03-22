import { getCompletion } from "../openai/completion";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSectionNewLine, moveStickiesToSectionNoWrap, setStickyColor } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class RelateProgram implements Program {
  public name = "relate";

  public getSummary(node: FrameNode) {
    return `Relate: ${getFieldByLabel("Relation (left to right)", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Relate</FormTitle>
        <Description>For each sticky in the left section, use the relation to find stickies in the right section.</Description>
        <TextField label="Relation (left to right)" value="can be solved by" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Relate", node)!.locked = true;
    getFieldByLabel("Relation (left to right)", node)!.label.locked = true;

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
    const relation = getFieldByLabel("Relation (left to right)", node)!.value.characters.trim();

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
      setStickyColor(stickyColors.Yellow, newKeyNode);
      moveStickiesToSectionNewLine([newKeyNode], targetSection);

      for (const valueNode of valueNodes) {
        const prompt = `Statement: ${keyNode.text.characters.replace(/\s+/g, " ")} ${relation} ${valueNode.text.characters.replace(/\s+/g, " ")}
Question: is it probable?
Answer (Yes/No): `;

        const binaryAnswer = (await getCompletion(context.completion, prompt, { max_tokens: 3 })).choices[0].text.trim();

        if (context.isAborted() || context.isChanged()) return;

        if (binaryAnswer.toLocaleLowerCase().includes("no")) {
          const combinedSticky = figma.createSticky();
          combinedSticky.text.characters = `${valueNode.text.characters}
=== Not related ===
`;

          const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
          if (!targetSection) return;
          setStickyColor(stickyColors.LightGray, combinedSticky);
          moveStickiesToSectionNoWrap([combinedSticky], targetSection);
        } else {
          const followupPrompt = `Statement: ${keyNode.text.characters.replace(/\s+/g, " ")} ${relation} ${valueNode.text.characters.replace(/\s+/g, " ")}
Question: why the statement might be true?
Answer: `;

          const fullAnswer = (await getCompletion(context.completion, followupPrompt, { max_tokens: 100 })).choices[0].text.trim();

          if (context.isAborted() || context.isChanged()) return;

          const combinedSticky = figma.createSticky();
          combinedSticky.text.characters = `${valueNode.text.characters}
=== Explanation ===
${fullAnswer}`;

          const targetSection = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
          if (!targetSection) return;
          setStickyColor(stickyColors.Green, combinedSticky);
          moveStickiesToSectionNoWrap([combinedSticky], targetSection);
        }
      }
    }
  }

  private getConfig(node: FrameNode) {
    return {
      temperature: parseFloat(getFieldByLabel("Temperature", node)!.value.characters),
      maxTokens: parseInt(getFieldByLabel("Max tokens", node)!.value.characters),
    };
  }
}
