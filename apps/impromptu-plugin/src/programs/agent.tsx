import { getCompletion } from "../openai/completion";
import { createOrUseSourceNodes, createTargetNodes } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { replaceNotification } from "../utils/notify";
import { sortLeftToRight } from "../utils/sort";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class AgentProgram implements Program {
  public name = "agent";

  public getSummary(node: FrameNode) {
    return `Agent: ${getFieldByLabel("Question", node)!.value.characters}`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Agent</FormTitle>
        <Description>Answer a question with the provided tools.</Description>
        <TextField label="Question" value="What should I do on day 1 as a PM on the Azure Portal team?" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Agent", node)!.locked = true;
    getFieldByLabel("Question", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Input", "Tools"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output", "Thoughts"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const sources = context.sourceNodes.sort(sortLeftToRight);

    if (sources.length < 1) {
      replaceNotification("Agent requires both the Input and the Tools section to perform tasks.");
      return;
    }

    const question = getFieldByLabel("Question", node)!.value.characters;

    const prompt = getToolsPrompt({ question });

    await getCompletion(context.completion, prompt, {
      max_tokens: 2000,
    });
  }
}

export function getToolsPrompt(input: { question: string }) {
  return `
Answer the following questions as best you can. You have access to the following tools:

Web search: Find articles on the internet. Give this tool only a simple text query

Get clarification: Ask the person who asked the question for more information

Find research insights: Find usability problems and solutions on software products

Ask a specific question.
Use the following format:
Question: the input question you must answer
Thought: you should always think about what to do
Action: the action to take, should be one of [Web search, Get clarification, Find research insights]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question
Begin!

Question: ${input.question}
`.trim();
}
