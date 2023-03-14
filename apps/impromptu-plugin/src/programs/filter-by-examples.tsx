import { getCompletion } from "../openai/completion";
import { createOrUseSourceNodes, moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class FilterByExamplesProgram implements Program {
  public name = "filter-by-examples";

  public getSummary(node: FrameNode) {
    return `Filter by examples: ${getFieldByLabel("Yes/No question", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Filter by examples</FormTitle>
        <Description>
          Ask a Yes/No question to each sticky and move the sticky to the corresponding output section. Existing output will be used as examples.
        </Description>
        <TextField label="Yes/No question" value="Does the statement mention a robot?" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Filter by examples", node)!.locked = true;
    getFieldByLabel("Yes/No question", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["All items"], context.selectedOutputNodes);

    const target1 = figma.createSection();
    target1.name = "Yes";

    const target2 = figma.createSection();
    target2.name = "No";

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: [target1, target2],
    };
  }

  public async onEdit(node: FrameNode) {}

  public async run(context: ProgramContext, node: FrameNode) {
    while (true && !context.isAborted()) {
      const question = getFieldByLabel("Yes/No question", node)!.value.characters;

      const currentSticky = getInnerStickies(context.sourceNodes).pop();
      if (!currentSticky) break;
      const targetNodes = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));

      if (targetNodes.length < 2) {
        // TODO zero shot mode
        break;
      }
      targetNodes[0].name = "Yes";
      targetNodes[1].name = "No";

      const positiveSamples = getInnerStickies([targetNodes[0]])
        .slice(0, 7)
        .map((sticky) => sticky.text.characters);
      const negativeSamples = getInnerStickies([targetNodes[1]])
        .slice(0, 7)
        .map((sticky) => sticky.text.characters);

      const prompt =
        `${positiveSamples.map((sample) => `Text: ${sample}\nQuestion: ${question}\nAnswer (Yes/No): Yes`).join("\n\n")}\n\n` +
        `${negativeSamples.map((sample) => `Text: ${sample}\nQuestion: ${question}\nAnswer (Yes/No): No`).join("\n\n")}` +
        `\n\nUse the following text to answer the following question with Yes/No: ${question}

Text: ${currentSticky.text.characters}
        
Answer (Yes/No): `;

      const topChoiceResult = (
        await getCompletion(context.completion, prompt, {
          max_tokens: 3,
        })
      ).choices[0].text.trim();

      // TODO user may have deleted the sticky during completion
      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      const isPositive = topChoiceResult.toLocaleLowerCase().includes("yes");
      const isNegative = topChoiceResult.toLocaleLowerCase().includes("no");
      if (!isPositive && !isNegative) {
        break;
      }

      // TODO: move sticky to matched category
      moveStickiesToSection([currentSticky], isPositive ? targetNodesAfterCompletion[0] : targetNodesAfterCompletion[1]);
    }
  }
}
