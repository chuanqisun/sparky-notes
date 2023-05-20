import { getMethodInputName } from "../hits/method-input";
import { ChatMessage } from "../openai/chat";
import { createOrUseSourceNodes, createTargetNodes, printSticky } from "../utils/edit";
import { Description, FormTitle, TextField, getFieldByLabel, getTextByContent } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { nonEmptyString } from "../utils/non-empty-string";
import { filterToType, getInnerStickies } from "../utils/query";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class ChatProgram implements Program {
  public name = "chat";

  public getSummary(node: FrameNode) {
    return `Chat: ${getFieldByLabel("System message", node)!.value.characters}`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `For each item in the ${getMethodInputName(node)}, get chatgpt response with system preset "${
      getFieldByLabel("System message", node)!.value.characters
    }"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Chat</FormTitle>
        <Description>Get chatgpt response on each sticky.</Description>
        <TextField label="System message" value="Be a helpful assistant. Answer user's question." />
        <TextField label="Temperature" value="0.7" />
        <TextField label="Max tokens" value="60" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Chat", node)!.locked = true;
    getFieldByLabel("System message", node)!.label.locked = true;
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
    const systemMessage = getFieldByLabel("System message", node)!.value.characters;

    for (const currentSticky of inputStickies) {
      const userMessage = [
        nonEmptyString(currentSticky.getPluginData("longContext"), currentSticky.getPluginData("shortContext")) ?? "",
        currentSticky.text.characters,
      ]
        .filter(Boolean)
        .join("\n\n");

      const messages: ChatMessage[] = [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: userMessage,
        },
      ];

      const config = this.getConfig(node);
      const apiConfig = {
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };

      const result = (await context.chat(messages, apiConfig)).choices[0].message.content ?? "";

      if (!figma.getNodeById(currentSticky.id)) continue;
      if (context.isAborted() || context.isChanged()) return;

      const targetNodesAfterCompletion = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"));
      if (!targetNodesAfterCompletion[0]) return;

      printSticky(node, result);
    }
  }

  private getConfig(node: FrameNode) {
    return {
      temperature: parseFloat(getFieldByLabel("Temperature", node)!.value.characters),
      maxTokens: parseInt(getFieldByLabel("Max tokens", node)!.value.characters),
    };
  }
}
