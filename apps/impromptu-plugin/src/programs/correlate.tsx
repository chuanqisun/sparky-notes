import { createOrUseSourceNodes } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class CorrelateProgram implements Program {
  public name = "correlate";

  public getSummary(node: FrameNode) {
    return `Correlate: ${getFieldByLabel("Condition", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Correlate</FormTitle>
        <Description>For each sticky on the left, correlate with any stickies on the right that meet the condition.</Description>
        <TextField label="Condition" value="The right sticky describes a solution to the problem in the left sticky." />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Correlate", node)!.locked = true;
    getFieldByLabel("Condition", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Left", "Right"], context.selectedOutputNodes);

    const target1 = figma.createSection();
    target1.name = "Correlated";

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: [target1],
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    return;
  }

  private getConfig(node: FrameNode) {
    return {
      temperature: parseFloat(getFieldByLabel("Temperature", node)!.value.characters),
      maxTokens: parseInt(getFieldByLabel("Max tokens", node)!.value.characters),
    };
  }
}
