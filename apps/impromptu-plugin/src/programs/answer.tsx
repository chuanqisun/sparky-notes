import { getCompletion } from "../openai/completion";
import { createOrUseSourceNodes, emptySections, moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class AnswerProgram implements Program {
  public name = "answer";

  public getSummary(node: FrameNode) {
    return `Answer: ${getFieldByLabel("Question", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Answer</FormTitle>
        <Description>Ask a question to each sticky and replace its content with the answer.</Description>
        <TextField label="Question" value="Does the statement mention a robot?" />
        <TextField label="Temperature" value="0.7" />
        <TextField label="Max tokens" value="60" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Answer", node)!.locked = true;
    getFieldByLabel("Question", node)!.label.locked = true;
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
    const question = getFieldByLabel("Question", node)!.value.characters;

    const targetContainers = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
    if (!targetContainers[0]) return;
    emptySections(targetContainers);

    for (let currentSticky of inputStickies) {
      if (!figma.getNodeById(currentSticky.id)) continue;
      if (context.isAborted() || context.isChanged()) return;

      const prompt = [
        currentSticky.getPluginData("longContext") ?? "",
        "Answer the question about the following text.\n\nText: " + currentSticky.text.characters + "\nQuestion: " + question,
        "Asnwer: ",
      ]
        .filter(Boolean)
        .join("\n\n");

      const config = this.getConfig(node);
      const apiConfig = {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };

      const result = (await getCompletion(context.completion, prompt, apiConfig)).choices[0].text.trim();

      if (!figma.getNodeById(currentSticky.id)) continue;
      if (context.isAborted() || context.isChanged()) return;

      // TODO user may have deleted the sticky during completion
      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!targetNodesAfterCompletion[0]) return;

      const newSticky = currentSticky.clone();
      await figma.loadFontAsync(newSticky.text.fontName as FontName);
      newSticky.text.characters = result;

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
