import { getCompletion } from "../openai/completion";
import { cloneSticky, createOrUseSourceNodes, moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class CompletionProgram implements Program {
  public name = "completion";

  public getSummary(node: FrameNode) {
    return `Completion: ${getFieldByLabel("Prompt", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Completion</FormTitle>
        <Description>Use a prompt to complete each sticky.</Description>
        <TextField label="Prompt" value="Conclusion:" />
        <TextField label="Temperature" value="0.7" />
        <TextField label="Max tokens" value="60" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Completion", node)!.locked = true;
    getFieldByLabel("Prompt", node)!.label.locked = true;
    getFieldByLabel("Temperature", node)!.label.locked = true;
    getFieldByLabel("Max tokens", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Input"], context.selectedOutputNodes);

    const target1 = figma.createSection();
    target1.name = "Output";

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: [target1],
    };
  }

  public async onEdit(node: FrameNode) {}

  public async run(context: ProgramContext, node: FrameNode) {
    const inputStickies = getInnerStickies(context.sourceNodes);
    const question = getFieldByLabel("Prompt", node)!.value.characters;

    for (const currentSticky of inputStickies) {
      const prompt = [currentSticky.getPluginData("longContext") ?? "", currentSticky.text.characters, question].filter(Boolean).join("\n\n");

      const config = this.getConfig(node);
      const apiConfig = {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };

      const result = (await getCompletion(context.completion, prompt, apiConfig)).choices[0].text;

      if (!figma.getNodeById(currentSticky.id)) continue;
      if (context.isAborted() || context.isChanged()) return;
      const newSticky = cloneSticky(currentSticky);

      // TODO user may have deleted the sticky during completion
      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!targetNodesAfterCompletion[0]) return;

      newSticky.text.characters += `\n\n${question}` + result;

      // TODO: move sticky to matched category
      moveStickiesToSection([newSticky], targetNodesAfterCompletion[0]);
    }
  }

  private getConfig(node: FrameNode) {
    return {
      temperature: parseFloat(getFieldByLabel("Temperature", node)!.value.characters),
      maxTokens: parseInt(getFieldByLabel("Max tokens", node)!.value.characters),
    };
  }
}
