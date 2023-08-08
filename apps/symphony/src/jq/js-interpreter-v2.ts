import type { FunctionDefinition } from "@h20/plex-chat";
import { type ChatMessage, type FnCallProxy } from "../openai/chat";
import { jsonToTyping } from "../reflection/json-reflection";

export interface GetSystemMessageInput {
  data: string;
}

export interface GetUserMessageInput {
  goal: string;
  lastError?: string;
}

export interface JsInterpreterConfig {
  data: any;
  goal: string;
  fnCallProxy: FnCallProxy;
  lastError?: string;
  onShouldAbort?: () => boolean;
  previousMessages?: ChatMessage[];
  retryLeft?: number;
}

export async function llmWeaver(config: JsInterpreterConfig): Promise<any> {
  const { data, goal, lastError, fnCallProxy, onShouldAbort, previousMessages = [], retryLeft = 3 } = config;

  const currentUserMessage: ChatMessage = { role: "user", content: getUserMessage({ lastError, goal }) };
  const systemMessage: ChatMessage = {
    role: "system",
    content: `${getSystemMessage({ data }).trim()}`,
  };
  const fnCallResponse = await fnCallProxy([systemMessage, ...previousMessages, currentUserMessage], {
    function_call: { name: "write_ts_program" },
    functions: getFunctionDefinition(),
  });

  if (onShouldAbort?.()) {
    throw new Error("Aborted");
  }

  try {
    const parsedFn = JSON.parse(fnCallResponse.arguments) as any;
    const fnSrc = parsedFn.src as string;

    const functionParams =
      fnSrc
        ?.match(/function\s*.+?\((.+?)\)/m)?.[1]
        .trim()
        ?.split(",")
        .map((i) => i.trim())
        .filter(Boolean) ?? [];
    const functionBody = fnSrc?.match(/function\s*.+?\s*\{((.|\n)*)\}/m)?.[1].trim() ?? "";

    console.log({ functionParams, functionBody, fnSrc });
    const syntheticFunction = new Function(...[...functionParams, functionBody]);
    const result = syntheticFunction(data);

    return result;
  } catch (e: any) {
    if (retryLeft <= 0) {
      throw new Error("Auto prompt engineering failed to converge. All retries used up");
    }

    const errorMessage = [e?.name, e?.message ?? e?.stack].filter(Boolean).join(" ").trim();

    return llmWeaver({
      ...config,
      lastError: errorMessage,
      previousMessages: [...previousMessages, currentUserMessage, { role: "assistant", content: "", function_call: fnCallResponse }],
      retryLeft: retryLeft - 1,
    });
  }
}

function getSystemMessage({ data }: GetSystemMessageInput) {
  return `
Write a javascript function to meet the goal.

The function must have the following signature:

"""
function transform(input: InputType): any[];
  
${jsonToTyping(data, "InputType")}
"""


Requirements: 
1. All child functions must be inlined into the transform function
2. No async operations
3. Vanilla javascript only. No typescript
`;
}

function getFunctionDefinition(): FunctionDefinition[] {
  return [
    {
      name: "write_js_program",
      description: "",
      parameters: {
        type: "object",
        properties: {
          src: {
            type: "array",
            items: {
              type: "string",
            },
            description: "lines of the source code",
          },
        },
        required: ["src"],
      },
    },
  ];
}

function getUserMessage({ lastError, goal }: GetUserMessageInput) {
  return lastError ? `The previous function call failed with error: ${lastError}. Try a different query` : `Goal: ${goal}`;
}
