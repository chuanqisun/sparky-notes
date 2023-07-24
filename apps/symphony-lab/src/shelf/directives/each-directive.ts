import type { ChatInput, FunctionCallRequest, FunctionDefinition } from "@h20/plex-chat";
import { feedbackLoop } from "../../jq/feedback-loop";
import type { ChatMessage, FnCallProxy, SimpleModelConfig } from "../../openai/chat";
import { jsonToTyping, sampleJsonContent } from "../../reflection/json-reflection";
import type { ShelfDirective } from "./base-directive";

export function createEachDirective(fnCall: FnCallProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/each"),
    run: async ({ source, data }) => {
      const goal = source.slice("/each".length).trim();
      const output = await llmTransformEach({
        data,
        goal,
        fnCallProxy: (messages: ChatMessage[], config?: SimpleModelConfig) =>
          fnCall(messages, { max_tokens: 2400, temperature: 0, ...config, models: ["gpt-35-turbo"] }),
        chatProxy: () => {},
      });

      return {
        data: output,
      };
    },
  };
}

export interface LlmTransformEachConfig {
  data: any[];
  goal: string;
  fnCallProxy: FnCallProxy;
  chatProxy: any;
}
async function llmTransformEach(config: LlmTransformEachConfig) {
  const { data, goal, fnCallProxy, chatProxy } = config;
  // if (!Array.isArray(data)) throw new Error("Data must be an array");

  const getTransformer = async (previousError?: any) => {
    const messages = getChatMessages(goal, data);
    const fnCallConfig = getFnCallConfig();
    const result = await fnCallProxy(messages, { ...fnCallConfig });
    const { transformSourceCodeString, inferenceTask } = JSON.parse(result.arguments) as any;
    console.log({ transformSourceCodeString, inferenceTask });
    const createLens = getLensFactory(result);
    return createLens(data);
  };

  const lenses = await feedbackLoop(getTransformer);
  const results = lenses.map((lens) => lens.set(chatProxy(lens.get())));

  return results;
}

const TRIPLE_TICKS = "```";

function getChatMessages(goal: string, data: any[]): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
Write a javascript function based on the provided sample data and goal. Use the signature delimited by backticks:

${TRIPLE_TICKS}
async function transform(input: InputType, llmInference: (input: string) => Promise<string>): Promise<any>;

${jsonToTyping(data, "InputType")}
${TRIPLE_TICKS}

Requirements:
1. Must call llmInference in parallel with Promise.all()
2. Must preserve information from the input
3. Hide typing in the source code
    `.trim(),
    },
    {
      role: "user",
      content: `
Sample input: 
${TRIPLE_TICKS}
${JSON.stringify(sampleJsonContent(data), null, 2)}
${TRIPLE_TICKS}

Goal: ${goal}`,
    },
  ];
  return messages;
}

function getFnCallConfig(): Partial<ChatInput> {
  const fnCall: FunctionCallRequest = { name: "write_js_fn" };
  const fnDef: FunctionDefinition[] = [
    {
      name: "write_js_fn",
      description: "",
      parameters: {
        type: "object",
        properties: {
          transformSourceCodeString: {
            type: "string",
            description: "transform function source code, serialized to one-line JSON string",
          },
          inferenceTask: {
            type: "string",
            description: "Describe what the llmInference function should do to each item",
          },
        },
        required: ["transformSourceCodeString", "inferenceTask"],
      },
    },
  ];

  return {
    function_call: fnCall,
    functions: fnDef,
  };
}

function getLensFactory(result: any) {
  return (...args: any[]) => ({} as any[]);
}
