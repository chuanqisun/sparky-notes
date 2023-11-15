import type { ChatInput, FunctionCallRequest, FunctionDefinition } from "@h20/plex-chat";
import { feedbackLoop } from "../../jq/feedback-loop";
import type { ChatMessage, ChatProxy, FnCallProxy, SimpleModelConfig } from "../../openai/chat";
import { jsonToTyping, sampleJsonContent } from "../../reflection/json-reflection";
import type { ShelfDirective } from "./base-directive";

export function createEachDirective(fnCall: FnCallProxy, chat: ChatProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/each"),
    run: async ({ source, data, updateStatus }) => {
      const goal = source.slice("/each".length).trim();
      const output = await llmTransformEach({
        data,
        goal,
        updateStatus,
        fnCallProxy: (messages: ChatMessage[], config?: SimpleModelConfig) =>
          fnCall(messages, { max_tokens: 2400, temperature: 0, ...config, models: ["gpt-4", "gpt-4-32k"] }),
        chatProxy: (messages: ChatMessage[], modelConfig?: SimpleModelConfig) =>
          chat(messages, { ...modelConfig, models: ["gpt-35-turbo", "gpt-35-turbo-16k"] }),
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
  updateStatus?: (status: string) => any;
  fnCallProxy: FnCallProxy;
  chatProxy: ChatProxy;
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
    const syntheticFunction = createSyntheticFunction(transformSourceCodeString);
    return { transform: syntheticFunction, itemLevelTask: inferenceTask };
  };

  const { transform, itemLevelTask } = await feedbackLoop(getTransformer);
  console.log("synthetic function", transform);

  const llmInferenceFn = createFnCallingInferenceFn(fnCallProxy, itemLevelTask);
  const llmInferenceChatFn = createChatInferenceFn(chatProxy, itemLevelTask);

  const results = await transform(data, llmInferenceChatFn);
  return results as any[];
}

function createSyntheticFunction(src: string) {
  const AsyncFunction = async function () {}.constructor as any;

  const functionParams =
    src
      ?.match(/(?:async\s)?function\s*.+?\((.+?)\)/m)?.[1]
      .trim()
      ?.split(",")
      .map((i) => i.trim())
      .filter(Boolean) ?? [];
  const functionBody = src?.match(/(?:async\s)?function\s*.+?\s*\{((.|\n)*)\}/m)?.[1].trim() ?? "";
  const syntheticFunction = new AsyncFunction(...functionParams, functionBody);
  return syntheticFunction as (...args: any[]) => Promise<any>;
}

function createChatInferenceFn(chatProxy: ChatProxy, task: string) {
  return (input: string) =>
    chatProxy(
      [
        {
          role: "system",
          content: `Perform the following task: ${task}
          
Respond the result of the task in this format. Do not add prefix or explanations:
"""
Output: <plaintext result>
"""

          `,
        },
        { role: "user", content: input },
      ],
      { max_tokens: 120 }
    ).then((result) => result.match(/Output: (.+)/)?.[1] ?? "Error: No output");
}

function createFnCallingInferenceFn(fnCallProxy: FnCallProxy, task: string) {
  return (input: string) =>
    fnCallProxy(
      [
        {
          role: "system",
          content: `Transform the input by performing this task: ${task}`,
        },
        {
          role: "user",
          content: input,
        },
      ],
      {
        max_tokens: 120,
        function_call: { name: "set_result" },
        functions: [
          {
            name: "set_result",
            description: "",
            parameters: {
              type: "object",
              properties: {
                result: {
                  type: "string",
                  description: "The output of the transform task",
                },
              },
              required: ["result"],
            },
          },
        ],
      }
    )
      .then((result) => (JSON.parse(result.arguments) as any).result as string)
      .catch((e) => `Error: ${e.message}`);
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
            description: "Rephrase the top level goal as llmInference task on the per item level",
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
