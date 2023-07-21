import { type ChatMessage, type FnCallProxy } from "../openai/chat";
import { jsonToTyping, sampleJsonContent } from "../reflection/json-reflection";

export interface GetSystemMessageInput {
  input: any;
}

export interface GetUserMessageInput {
  lastError?: string;
}

export interface JsAutoPromptConfig {
  input: any;
  lastError?: string;
  fnCallProxy: FnCallProxy;
  onGetUserMessage: (input: GetUserMessageInput) => string;
  onJsString?: (jqString: string) => any;
  onRetry?: (errorMessage: string) => any;
  onShouldAbort?: () => boolean;
  onValidateResult?: (result: any) => any;
  onGetSystemMessage?: (props: GetSystemMessageInput) => string;
  previousMessages?: ChatMessage[];
  retryLeft?: number;
}

export async function jsAutoPromptV3(config: JsAutoPromptConfig): Promise<any> {
  const {
    input,
    lastError,
    fnCallProxy,
    onGetUserMessage,
    onGetSystemMessage = getDefaultSystemMessage,
    onRetry,
    onShouldAbort,
    previousMessages = [],
    retryLeft = 3,
  } = config;

  const currentUserMessage: ChatMessage = { role: "user", content: onGetUserMessage({ lastError: lastError ? lastError : undefined }) };
  const systemMessage: ChatMessage = {
    role: "system",
    content: `${onGetSystemMessage({ input }).trim()}`,
  };
  const fnCallResponse = await fnCallProxy([systemMessage, ...previousMessages, currentUserMessage], {
    function_call: { name: "define_js_function" },
    functions: [
      {
        name: "define_js_function",
        description: "",
        parameters: {
          type: "object",
          properties: {
            srcLines: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Line by line source code of the function",
            },
          },
          required: ["srcLines"],
        },
      },
    ],
  });
  const parsedFn = JSON.parse(fnCallResponse.arguments) as any;
  const fnSrc = parsedFn.srcLines.join("\n") as string;

  if (onShouldAbort?.()) {
    throw new Error("Aborted");
  }

  try {
    const functionParams =
      fnSrc
        ?.match(/function\s*.+?\((.+?)\)/m)?.[1]
        .trim()
        ?.split(",")
        .map((i) => i.trim())
        .filter(Boolean) ?? [];
    const functionBody = fnSrc?.match(/function\s*.+?\s*\{((.|\n)*)\}/m)?.[1].trim() ?? "";

    console.log({ functionParams, functionBody });
    const syntheticFunction = new Function(...[...functionParams, functionBody]);
    const result = syntheticFunction(input);

    return result;
  } catch (e: any) {
    if (retryLeft <= 0) {
      throw new Error("Auto prompt engineering failed to converge. All retries used up");
    }

    const errorMessage = [e?.name, e?.message ?? e?.stack].filter(Boolean).join(" ").trim();
    onRetry?.(errorMessage);

    return jsAutoPromptV3({
      ...config,
      lastError: errorMessage,
      previousMessages: [...previousMessages, currentUserMessage, { role: "assistant", content: undefined as any, function_call: fnCallResponse }],
      retryLeft: retryLeft - 1,
      onGetUserMessage,
    });
  }
}

function getDefaultSystemMessage({ input }: GetSystemMessageInput) {
  return `
Design a javascript function that transforms a single input into an array that meets the provided goal.
All child function decalarations must be inlined into the function body.
The function has the following signature:

"""
function transform(input: InputType): any[];
  
${jsonToTyping(input, "InputType")}
"""

Sample input:
"""
${JSON.stringify(sampleJsonContent(input), null, 2)}
"""
`;
}
