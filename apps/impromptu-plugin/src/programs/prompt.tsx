import { getCompletion } from "../openai/completion";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, sourceNodesToText } from "../utils/query";
import { Program, ProgramContext } from "./program";

const { AutoLayout } = figma.widget;

export class PromptProgram implements Program {
  public name = "prompt";

  public getSummary(node: FrameNode) {
    const input = getFieldByLabel("Input", node)!;
    return `Prompt: "${input.value.characters}"`;
  }

  public async create() {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Prompt</FormTitle>
        <Description>Use a prompt to elicit response. Information from the context will be combined and used as prefix to the prompt.</Description>
        <TextField label="Input" value="What is the second law of thermodynamics?" />
        <TextField label="Temperature" value="0.7" />
        <TextField label="Max tokens" value="60" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Prompt", node)!.locked = true;
    getFieldByLabel("Input", node)!.label.locked = true;
    getFieldByLabel("Temperature", node)!.label.locked = true;
    getFieldByLabel("Max tokens", node)!.label.locked = true;

    const source1 = figma.createSection();
    source1.name = "Context";

    const target1 = figma.createSection();
    target1.name = "Output";

    return {
      programNode: node,
      sourceNodes: [source1],
      targetNodes: [target1],
    };
  }

  public async onEdit(node: FrameNode) {
    // handle user edits in figma file
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const config = this.getConfig(node);
    const contextText = sourceNodesToText(context.sourceNodes);
    const promptText = this.getPromptText(node);
    const apiConfig = {
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };
    const topChoiceResult = (await getCompletion(context.completion, `${contextText}\n\n${promptText}`, apiConfig)).choices[0].text.trim();
    const normalizedResult = topChoiceResult.length ? topChoiceResult : "No result";

    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetNode) return;
    const text = figma.createText();
    await figma.loadFontAsync(text.fontName as FontName);

    targetNode.children.forEach((child) => child.remove());
    text.characters = normalizedResult;
    targetNode.appendChild(text);

    text.resize(Math.min(text.width, 300), text.height);
    text.x = 16;
    text.y = 16;

    const originalWidth = targetNode.width;
    targetNode.resizeWithoutConstraints(text.x + text.width + 16, text.y + text.height + 16);
    targetNode.x += (originalWidth - targetNode.width) / 2;
  }

  private getPromptText(node: FrameNode) {
    return getFieldByLabel("Input", node)!.value.characters.trim();
  }

  private getConfig(node: FrameNode) {
    return {
      temperature: parseFloat(getFieldByLabel("Temperature", node)!.value.characters),
      maxTokens: parseInt(getFieldByLabel("Max tokens", node)!.value.characters),
    };
  }
}
