import { getCompletion } from "../openai/completion";
import { cloneSticky, createOrUseSourceNodes, moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class CategorizeProgram implements Program {
  public name = "categorize";

  public getSummary(node: FrameNode) {
    const [type] = node.findAllWithCriteria({ types: ["TEXT"] });
    const targetNodeNames = getNextNodes(node)
      .filter(filterToType<SectionNode>("SECTION"))
      .map((node) => node.name)
      .join(", ");

    return `Categorize: ${targetNodeNames}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Categorize</FormTitle>
        <Description>Lock an output sticky to use it as training example.</Description>
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Categorize", node)!.locked = true;

    const sources = createOrUseSourceNodes(["Uncategorized"], context.selectedOutputNodes);

    const target1 = figma.createSection();
    target1.name = "Category A";

    const target2 = figma.createSection();
    target2.name = "Category B";

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: [target1, target2],
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const inputStickies = getInnerStickies(context.sourceNodes);

    for (const currentSticky of inputStickies) {
      const targetNodes = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));

      const trainingSamples = targetNodes.flatMap((targetNode) =>
        getInnerStickies([targetNode])
          .slice(0, 7)
          .map((sticky) => ({
            category: targetNode.name,
            text: sticky.text.characters,
          }))
      );

      const maxCategoryWordCount = Math.max(...targetNodes.map((targetNode) => targetNode.name.split(" ").length));

      const prompt =
        `${trainingSamples.map((sample) => `Example: ${sample.text}\nCategory: ${sample.category}`).join("\n\n")}` +
        `\n\nClassify the following text into 1 of the following categories: [${targetNodes.map((targetNode) => targetNode.name).join(", ")}]

Text: ${currentSticky.text.characters}
        
Classified category: `;

      const topChoiceResult = (
        await getCompletion(context.completion, prompt, {
          max_tokens: Math.min(5, 4 * maxCategoryWordCount),
        })
      ).choices[0].text.trim();

      if (!figma.getNodeById(currentSticky.id)) continue;
      if (context.isAborted() || context.isChanged()) return;

      // TODO user may have deleted the sticky during completion
      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      const matchedCategory = targetNodesAfterCompletion.find(
        (targetNode) =>
          targetNode.name.toLocaleLowerCase().includes(topChoiceResult.toLocaleLowerCase()) ||
          topChoiceResult.toLocaleLowerCase().includes(targetNode.name.toLocaleLowerCase())
      );

      // exit loop when no category is matched
      if (!matchedCategory) break;

      // TODO: move sticky to matched category
      moveStickiesToSection([cloneSticky(currentSticky)], matchedCategory);
    }
  }
}
