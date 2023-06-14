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
  responseTemplate: `Reason: <Analyze the user goal, the input, and any previous errors>
jq: '<query string surrounded by single quotes>'`,
}).trim()}`.trim(),
  };
  const responseText = await onGetChat([systemMessage, ...previousMessages, currentUserMessage]);

  if (onShouldAbort?.()) {
    throw new Error("Aborted");
  }

  try {
    debugger;
    const jqString = responseText.match(/^jq\:\s*'(.+?)'/m)?.[1] ?? "";
    onJqString?.(jqString);

    if (!jqString) {
      const e = new Error(`Error parsing jq string with regex ${String.raw`/^jq\:\s*'(.+?)'/m`}`);
      e.stack = "";
      throw e;
    }

    const result = await promised.json(input, jqString);

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
      previousMessages: [...previousMessages, currentUserMessage, { role: "system", content: responseText }],
      retryLeft: retryLeft - 1,
      onGetUserMessage: onGetUserMessage,
    });
  }
}
