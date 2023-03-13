import { moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class SortProgram implements Program {
  public name = "sort";

  public getSummary(node: FrameNode) {
    return `Sort: ${getFieldByLabel("Top sticky description", node)!.value.characters}`;
  }

  public async create() {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Sort</FormTitle>
        <Description>Stickies will be re-arranged based on what you would like to see on top.</Description>
        <TextField label="Top sticky description" value="The most counterintuitive" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Sort", node)!.locked = true;
    getFieldByLabel("Top sticky description", node)!.label.locked = true;

    const source1 = figma.createSection();
    source1.name = "Unsorted items";

    const target1 = figma.createSection();
    target1.name = "Sorted";

    return {
      programNode: node,
      sourceNodes: [source1],
      targetNodes: [target1],
    };
  }

  public async onEdit(node: FrameNode) {}

  public async run(context: ProgramContext, node: FrameNode) {
    while (true && !context.isAborted()) {
      const sortGoal = getFieldByLabel("Top sticky description", node)!.value.characters;

      const inputStickies = getInnerStickies(context.sourceNodes);
      if (!inputStickies.length) break;

      // TODO: move sticky to matched category
      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!targetNodesAfterCompletion.length) return;

      moveStickiesToSection(inputStickies, targetNodesAfterCompletion[0]);
    }
  }
}
