import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class CollectProgram implements Program {
  public name = "collect";

  public getSummary(node: FrameNode) {
    return `Collect changes`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Collect all the output from the previous step`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Collect</FormTitle>
        <Description>Collect any stickies and prevent them from being cleared after each run</Description>
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Collect", node)!.locked = true;

    const sources = createOrUseSourceNodes(["Input"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const inputStickies = getInnerStickies(context.sourceNodes);
    const output = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!output) return;

    const clonedStickies = inputStickies.map((sticky) => sticky.clone());
    moveStickiesToSection(clonedStickies, output);
    clonedStickies.forEach((sticky) => (sticky.locked = true));
  }
}
