import { promised } from "jq-web-wasm/jq.wasm";
import { type ChatMessage } from "../openai/chat";

export interface GetSystemMessageInput {
  input: any;
  responseTemplate: string;
}

export interface GetUserMessageInput {
  lastError?: string;
}

export interface JqAutoPromptConfig {
  input: any;
  lastError?: string;
  onGetChat: (messages: ChatMessage[]) => Promise<string>;
  onGetUserMessage: (input: GetUserMessageInput) => string;
  onJqString?: (jqString: string) => any;
  onRetry?: (errorMessage: string) => any;
  onShouldAbort?: () => boolean;
  onValidateResult?: (result: any) => any;
  previousMessages?: ChatMessage[];
  retryLeft?: number;
  getSystemMessage: (input: GetSystemMessageInput) => string;
}

export async function jqAutoPrompt(config: JqAutoPromptConfig): Promise<any> {
  const {
    input,
    lastError,
    onGetChat,
    onGetUserMessage,
    onJqString,
    onRetry,
    onShouldAbort,
    onValidateResult,
    previousMessages = [],
    retryLeft = 3,
    getSystemMessage,
  } = config;

  const currentUserMessage: ChatMessage = { role: "user", content: onGetUserMessage({ lastError: lastError ? lastError : undefined }) };
  const systemMessage: ChatMessage = {
    role: "system",
    content: `
${getSystemMessage({
  input: input,
  responseTemplate: `
Reflect: <If available, reflect on the cause of any previous error>
Observe input: <Describe the shape of the input>
Desired output: <Describe the shape of the output in English>
Explain solution: <Describe how to transform from input to output in English>
Final answer:
\`\`\`jq
<The valid jq filter string>
\`\`\`
`.trim(),
}).trim()}`.trim(),
  };
  const responseText = await onGetChat([systemMessage, ...previousMessages, currentUserMessage]);

  if (onShouldAbort?.()) {
    throw new Error("Aborted");
  }

  try {
    const jqString =
      responseText.match(/^Final answer\:\s*```jq\n(.+?)\n```/m)?.[1] ??
      responseText.match(/^Final answer\:\s*```\n(.+?)\n```/m)?.[1] ??
      responseText.match(/^Final answer\:\s*```(.+?)```/m)?.[1] ??
      responseText.match(/^Final answer\:\s*"(.+?)"/m)?.[1] ??
      responseText.match(/^Final answer\:\s*'(.+?)'/m)?.[1] ??
      responseText.match(/^Final answer\:\s*`(.+?)`/m)?.[1] ??
      "";

    const withoutStartingEndingQuotes = jqString.match(/^"(.+)"$/)?.[1] ?? jqString.match(/^'(.+)'$/)?.[1] ?? jqString.match(/^`(.+)`$/)?.[1] ?? jqString;

    console.log([jqString, withoutStartingEndingQuotes]);

    onJqString?.(withoutStartingEndingQuotes);

    if (!withoutStartingEndingQuotes) {
      const e = new Error(`Error parsing jq string with regex`);
      e.stack = "";
      throw e;
    }

    const result = await promised.json(input, withoutStartingEndingQuotes);

    onValidateResult?.(result);

    return result;
  } catch (e: any) {
    if (retryLeft <= 0) {
      // two messages per iteration
      throw new Error("Auto prompt engineering failed to converge. All retries used up");
    }

    const errorMessage = [e?.name, e?.message ?? e?.stack].filter(Boolean).join(" ").trim();
    onRetry?.(errorMessage);

    return jqAutoPrompt({
      ...config,
      lastError: errorMessage,
      previousMessages: [...previousMessages, currentUserMessage, { role: "assistant", content: responseText }],
      retryLeft: retryLeft - 1,
      onGetUserMessage: onGetUserMessage,
    });
  }
}
