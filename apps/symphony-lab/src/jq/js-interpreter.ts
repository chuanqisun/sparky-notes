import type { FunctionDefinition } from "@h20/plex-chat";
import { type ChatMessage, type FnCallProxy } from "../openai/chat";
import { jsonToTyping, sampleJsonContent } from "../reflection/json-reflection";

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

export async function jsInterpreter(config: JsInterpreterConfig): Promise<any> {
  const { data, goal, lastError, fnCallProxy, onShouldAbort, previousMessages = [], retryLeft = 3 } = config;

  const currentUserMessage: ChatMessage = { role: "user", content: getUserMessage({ lastError, goal }) };
  const systemMessage: ChatMessage = {
    role: "system",
    content: `${getSystemMessage({ data }).trim()}`,
  };
  const fnCallResponse = await fnCallProxy([systemMessage, ...previousMessages, currentUserMessage], {
    function_call: { name: "define_js_function" },
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

    return jsInterpreter({
      ...config,
      lastError: errorMessage,
      previousMessages: [...previousMessages, currentUserMessage, { role: "assistant", content: "", function_call: fnCallResponse }],
      retryLeft: retryLeft - 1,
    });
  }
}

function getSystemMessage({ data }: GetSystemMessageInput) {
  return `
Define a javascript function based on the goal. It must have the following signature:
\`\`\`
function main(input: InputType): any[];

${jsonToTyping(data, "InputType")}
\`\`\`

Sample input:
\`\`\`json
${JSON.stringify(sampleJsonContent(data), null, 2)}
\`\`\`

You can assume an AI library exists for any inference tasks. You can all ai.methodName without defining it.
Now respond the source code of the main function.
`;
}

function getFunctionDefinition(): FunctionDefinition[] {
  return [
    {
      name: "define_js_function",
      description: "",
      parameters: {
        type: "object",
        properties: {
          src: {
            type: "string",
            description: "Source code of the main function. Must be valid single-line json string",
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
