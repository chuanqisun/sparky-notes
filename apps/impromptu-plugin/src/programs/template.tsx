import { getCompletion, OpenAICompletionPayload } from "../openai/completion";
import { createOrUseSourceNodes, createTargetNodes, printSticky } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class TemplateProgram implements Program {
  public name = "template";

  public getSummary(node: FrameNode) {
    return `Template: ${getFieldByLabel("Template string", node)!.value.characters}`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Prompt engineering with custom template and variables`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Template</FormTitle>
        <Description>
          Prompt for completion with a template. Each template variable surrounded by double curly braces will be substituted with the text from the input
          section where the section name matches the variable name. Input section with a single sticky will be inserted in the template as inline text. Input
          section with two or more stickies will be inserted into the template as an unordered list in markdown format.
        </Description>
        <TextField label="Template string" value="What does {{Variable A}} and {{Variable B}} have in common?" />
        <TextField label="Temperature" value="0.7" />
        <TextField label="Max tokens" value="100" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Template", node)!.locked = true;
    getFieldByLabel("Template string", node)!.label.locked = true;
    getFieldByLabel("Temperature", node)!.label.locked = true;
    getFieldByLabel("Max tokens", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Variable A", "Variable B"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const variableMap = new Map<string, string>();

    if (!context.sourceNodes.length) return;

    context.sourceNodes.forEach((sourceNode) => {
      const variableValues = getInnerStickies([sourceNode]).map((sticky) => sticky.text.characters.trim());
      if (variableValues.length === 0) return;
      if (variableValues.length === 1) {
        return variableMap.set(sourceNode.name, variableValues[0]);
      }
      variableMap.set(sourceNode.name, variableValues.map((value) => `- ${value}`).join("\n"));
    });

    // compile the template by replace double curly braces with the variable values
    const templateString = getFieldByLabel("Template string", node)!.value.characters;
    const compiledTemplate = templateString.replace(/{{(.*?)}}/g, (_, variableName) => variableMap.get(variableName) ?? "");

    const config = this.getConfig(node);

    const apiConfig: Partial<OpenAICompletionPayload> = {
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };
    const result = (await getCompletion(context.completion, compiledTemplate, apiConfig)).choices[0].text.trim();

    if (context.isAborted() || context.isChanged()) return;

    printSticky(node, result);
  }

  private getConfig(node: FrameNode) {
    return {
      temperature: parseFloat(getFieldByLabel("Temperature", node)!.value.characters),
      maxTokens: parseInt(getFieldByLabel("Max tokens", node)!.value.characters),
    };
  }
}
