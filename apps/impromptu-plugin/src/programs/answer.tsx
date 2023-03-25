import { getCompletion } from "../openai/completion";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSection } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class AnswerProgram implements Program {
  public name = "answer";

  public getSummary(node: FrameNode) {
    return `Answer: ${getFieldByLabel("Question", node)!.value.characters}`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Answer the question "${getFieldByLabel("Question", node)!.value.characters}"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Answer</FormTitle>
        <Description>For each sticky, generate a new sticky that contains the answer to the question.</Description>
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
    const targets = createTargetNodes(["Output"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const inputStickies = getInnerStickies(context.sourceNodes);
    const question = getFieldByLabel("Question", node)!.value.characters;

    for (let currentSticky of inputStickies) {
      const pretext = currentSticky.getPluginData("longContext");
      const prompt = `${
        pretext.length
          ? `Read the following article and answer the question.
Article """
${pretext}
"""`
          : ""
      }

Answer the question about the following text.

Text: """
${currentSticky.text.characters}
${currentSticky.getPluginData("shortContext") ?? ""}
"""
Question: ${question}
Answer: `;

      const config = this.getConfig(node);
      const apiConfig = {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };

      const result = (await getCompletion(context.completion, prompt, apiConfig)).choices[0].text.trim();

      if (!figma.getNodeById(currentSticky.id)) continue;
      if (context.isAborted() || context.isChanged()) return;

      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!targetNodesAfterCompletion[0]) return;

      const newSticky = currentSticky.clone();
      newSticky.text.characters = result;

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
