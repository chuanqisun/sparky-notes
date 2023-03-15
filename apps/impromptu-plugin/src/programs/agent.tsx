import { getCompletion, OpenAICompletionPayload } from "../openai/completion";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSection, moveStickiesToSectionNewLine } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType } from "../utils/query";
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

    let iteration = 0;
    let isCompleted = false;

    if (sources.length < 1) {
      replaceNotification("Agent requires both the Input and the Tools section to perform tasks.");
      return;
    }

    const question = getFieldByLabel("Question", node)!.value.characters;

    let memory = "";

    while (iteration < 10 && !isCompleted) {
      const prompt = getAgentPrompt({ question, memory });
      const response = (await getCompletion(context.completion, ...prompt)).choices[0].text;

      const finalAnswer = response.split("\n").find((line) => line.startsWith("Final Answer:"));
      if (finalAnswer) {
        isCompleted = true;
        const sticky = figma.createSticky();
        sticky.text.characters = finalAnswer.trim();
        const outputContainer = getNextNodes(node)
          .filter(filterToType<SectionNode>("SECTION"))
          .find((item) => item.name === "Output");
        if (!outputContainer) return;

        moveStickiesToSection([sticky], outputContainer);
        return;
      }

      const thoughts = response.split("\n").filter((line) => line.startsWith("Thought:"));

      thoughts.forEach((thought) => {
        const sticky = figma.createSticky();
        sticky.text.characters = thought.trim();
        const thoughtsContainer = getNextNodes(node)
          .filter(filterToType<SectionNode>("SECTION"))
          .find((item) => item.name === "Thoughts");
        if (!thoughtsContainer) return;
        moveStickiesToSectionNewLine([sticky], thoughtsContainer);
      });

      const action = response.split("\n").find((line) => line.startsWith("Action:"));
      const actionInput = response.split("\n").find((line) => line.startsWith("Action Input:"));
      if (!action || !actionInput) {
        memory += response;
        memory += "Observation: I need to continue.";
        iteration++;
        continue;
      }

      console.log(`[action]`, [action, actionInput]);
      const observation = await act({ action, actionInput });
      const dummyObservation = `Observation: ${observation}\n`;

      memory += response;
      memory += dummyObservation;

      iteration++;
    }
  }
}

export async function act(input: { action: string; actionInput: string; context?: string }) {
  if (input.action.includes("Web search")) {
    return "Azure Portal is difficult to use for new users";
  } else if (input.action.includes("Find research insights")) {
    return "No research has been performed on Azure Portal yet";
  } else {
    return "Tool not available";
  }
}

export function getAgentPrompt(input: { question: string; memory: string }) {
  const prompt = `
Answer the following questions as best you can. You have access to the following tools:

Web search: Find articles on the internet. Give this tool only a simple text query

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

Question: ${input.question}${input.memory}`.trimStart();

  const config: Partial<OpenAICompletionPayload> = {
    max_tokens: 2000,
    stop: ["Observation"],
  };

  return [prompt, config] as const;
}
