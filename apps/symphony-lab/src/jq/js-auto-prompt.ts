import { type ChatMessage } from "../openai/chat";
import { jsonToTyping, sampleJsonContent } from "./json-reflection";

export interface GetSystemMessageInput {
  input: any;
}

export interface GetUserMessageInput {
  lastError?: string;
}

export interface JsAutoPromptConfig {
  input: any;
  lastError?: string;
  onGetChat: (messages: ChatMessage[]) => Promise<string>;
  onGetUserMessage: (input: GetUserMessageInput) => string;
  onJsString?: (jqString: string) => any;
  onRetry?: (errorMessage: string) => any;
  onShouldAbort?: () => boolean;
  onValidateResult?: (result: any) => any;
  previousMessages?: ChatMessage[];
  retryLeft?: number;
}

export async function jsAutoPrompt(config: JsAutoPromptConfig): Promise<any> {
  const { input, lastError, onGetChat, onGetUserMessage, onRetry, onShouldAbort, previousMessages = [], retryLeft = 3 } = config;

  const currentUserMessage: ChatMessage = { role: "user", content: onGetUserMessage({ lastError: lastError ? lastError : undefined }) };
  const systemMessage: ChatMessage = {
    role: "system",
    content: `${getDefaultSystemMessage({ input }).trim()}`,
  };
  const responseText = await onGetChat([systemMessage, ...previousMessages, currentUserMessage]);

  if (onShouldAbort?.()) {
    throw new Error("Aborted");
  }

  try {
    const fencedCode = responseText.match(/```javascript((.|\n)*)```/m)?.[1].trim();
    const functionParams =
      fencedCode
        ?.match(/function\s*.+?\((.+?)\)/m)?.[1]
        .trim()
        ?.split(",")
        .map((i) => i.trim())
        .filter(Boolean) ?? [];
    const functionBody = fencedCode?.match(/function\s*.+?\s*\{((.|\n)*)\}/m)?.[1].trim() ?? "";

    console.log({ functionParams, functionBody });
    const syntheticFunction = new Function(...[...functionParams, functionBody]);
    const result = JSON.parse(syntheticFunction(JSON.stringify(input)));

    return result;
  } catch (e: any) {
    if (retryLeft <= 0) {
      // two messages per iteration
      throw new Error("Auto prompt engineering failed to converge. All retries used up");
    }

    const errorMessage = [e?.name, e?.message ?? e?.stack].filter(Boolean).join(" ").trim();
    onRetry?.(errorMessage);

    return jsAutoPrompt({
      ...config,
      lastError: errorMessage,
      previousMessages: [...previousMessages, currentUserMessage, { role: "assistant", content: responseText }],
      retryLeft: retryLeft - 1,
      onGetUserMessage: onGetUserMessage,
    });
  }
}

function getDefaultSystemMessage({ input }: GetSystemMessageInput) {
  return `
Design with a javascript function that transforms a single input parameter into an array that meets the provided goal. The input parameter is defined by the following type

\`\`\`typescript
${jsonToTyping(input)}
\`\`\`

Sample input:
\`\`\`json
${(JSON.stringify(sampleJsonContent(input)), null, 2)}
\`\`\`

Now respond with the source code, use this format
\`\`\`javascript
function transform(input) {
  const inputObject = JSON.parse(input);
  ...
  const output = JSON.stringify(resultObject);
  return output;
}
\`\`\`
`;
}
