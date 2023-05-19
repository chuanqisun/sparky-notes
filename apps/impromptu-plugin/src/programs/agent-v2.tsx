import { ChatMessage } from "../openai/chat";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSection, setFillColor } from "../utils/edit";
import { ensureStickyFont } from "../utils/font";
import { Description, FormTitle, TextField, getFieldByLabel, getTextByContent } from "../utils/form";
import { replaceNotification } from "../utils/notify";
import { getInnerStickies } from "../utils/query";
import { sortLeftToRight } from "../utils/sort";
import { ArxivSearchTool } from "./agent-tools/arxiv-search";
import { AssumptionTool } from "./agent-tools/assume";
import { BaseTool } from "./agent-tools/base-tool";
import { CatchAllTool } from "./agent-tools/catch-all-tool";
import { DeductionTool } from "./agent-tools/deduction";
import { HypothesisTool } from "./agent-tools/hypothesize";
import { InductionTool } from "./agent-tools/induction";
import { UxInsightTool } from "./agent-tools/ux-insights";
import { WebSearchTool } from "./agent-tools/web-search";
import { CreationContext, Program, ProgramContext, ReflectionContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

const MIN_ITER = 3;
const MAX_ITER = 25;
const FINAL_ANSWER_LENGTH = 1000;
export const INTERMEDIATE_ANSWER_LENGTH = 400;
const MEM_WINDOW = 2000;

const allTools: BaseTool[] = [
  new ArxivSearchTool(),
  new WebSearchTool(),
  new UxInsightTool(),
  new DeductionTool(),
  new InductionTool(),
  new HypothesisTool(),
  new AssumptionTool(),
];

export class AgentV2Program implements Program {
  public name = "agent-v2";

  public getSummary(node: FrameNode) {
    return `Agent: ${getFieldByLabel("Question", node)!.value.characters}`;
  }

  public getMethodology(_context: ReflectionContext, node: FrameNode) {
    return `Use an AI assistant to answer the question "${getFieldByLabel("Question", node)!.value.characters}"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Agent</FormTitle>
        <Description>Answer a question with the provided tools.</Description>
        <TextField
          label="Question"
          value="I’m new to the Azure Network Manager product. Summarize existing research and help me come up with suggestions to the product design team."
        />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Agent", node)!.locked = true;
    getFieldByLabel("Question", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Tools"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Output"]);

    // add default tools
    const tools = await getDefaultTools(allTools);
    moveStickiesToSection(tools, sources[0]);
    tools.forEach((tool) => (tool.locked = true));

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const sources = context.sourceNodes.sort(sortLeftToRight);

    const stickyTools: AgentTool[] = getInnerStickies([sources[0]]).map((sticky) => {
      const [name, description] = sticky.text.characters.trim().split(": ");
      return { name, description };
    });

    const runtimeTools: BaseTool[] = [...allTools, new CatchAllTool(stickyTools.map((tool) => tool.name))];

    let iteration = 0;
    let isCompleted = false;

    if (sources.length < 1) {
      replaceNotification("Agent requires the Tools section to perform tasks.");
      return;
    }

    const question = getFieldByLabel("Question", node)!.value.characters;

    let memoryMessages: ChatMessage[] = [];

    while (iteration < 10 && !isCompleted) {
      const messages = getAgentMessages({ question, memory: memoryMessages, tools: stickyTools });

      const result = (await context.chat(messages, { max_tokens: 200, stop: ["Observation"] })).choices[0].message.content ?? "";
      if (context.isAborted() || context.isChanged()) return;
      const { answer, action, input } = parseAction(result);

      if (answer) {
        console.log("Final answer", answer);
        isCompleted = true;
        break;
      }

      if (!action) {
        console.log("Action failed", answer);
        // TODO
        break;
      }

      console.log("Action", [action, input]);
      const observation = await act({ action: action, actionInput: input ?? "", programContext: context, pretext: "", tools: runtimeTools });
      console.log("Observation", observation);

      memoryMessages.push({ role: "assistant", content: result });
      memoryMessages.push({ role: "user", content: `Observation:\n${observation}\n\nNext thought?` });

      iteration++;
    }
  }
}

function parseAction(rawResponse: string) {
  const answer = rawResponse.match(/Final Answer: (.*)/im)?.[1].trim();
  const action = rawResponse.match(/Action: (.*)/im)?.[1].trim();
  const input = rawResponse.match(/Action Input: (.*)/im)?.[1].trim();
  return {
    answer,
    action,
    input,
  };
}

async function act(input: { action: string; actionInput: string; programContext: ProgramContext; pretext: string; tools: BaseTool[] }) {
  const actionName = input.action.toLocaleLowerCase();
  const tool = input.tools.find((tool) => actionName.includes(tool.name.toLocaleLowerCase()) || tool.name.toLocaleLowerCase().includes(actionName))!;
  return (await tool.run(input)).observation;
}

export interface AgentTool {
  name: string;
  description: string;
}

async function getDefaultTools(tools: BaseTool[]) {
  await ensureStickyFont();

  return tools.map((tool) => {
    const sticky = figma.createSticky();
    setFillColor(stickyColors.Yellow, sticky);
    sticky.text.characters = `${tool.name}: ${tool.description}`;
    return sticky;
  });
}

function getAgentMessages(input: { question: string; memory: ChatMessage[]; tools: AgentTool[] }) {
  // TODO add memory until limit reached iteratively with token limiter
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
    
Answer the following question step by step. You have access to the following tools:

${input.tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n\n")}

In each step, think and plan an action. Respond in this format:

Thought: <think about what to do in this step>
Action: <the action to take, should be one of [${input.tools.map((tool) => tool.name).join(", ")}]>
Action Input: <the input to the action>

The user will provide the observation after each Action. When you have enough observation to answer the question, respond in this format:

Thought: I now know the final answer
Final Answer: <the final answer to the original input question>
    `,
    },
    {
      role: "user",
      content: `
${input.question}
      `,
    },
    ...input.memory,
  ];

  return messages;
}
