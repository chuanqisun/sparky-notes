import { promised } from "jq-web-wasm/jq.wasm";
import { ChatMessage } from "../openai/chat";

export interface GetSystemMessageInput {
  dataFrame: any;
}

export interface GetUserMessageInput {
  lastError?: string;
}

export interface JqAutoPromptConfig {
  dataFrame: any;
  lastError?: string;
  onGetChat: (messages: ChatMessage[]) => Promise<string>;
  onGetUserMessage: (input: GetUserMessageInput) => string;
  onJqString?: (jqString: string) => any;
  onRetry?: (errorMessage: string) => any;
  onShouldAbort?: () => boolean;
  previousMessages?: ChatMessage[];
  retryLeft?: number;
  getSystemMessage: (input: GetSystemMessageInput) => string;
}

export async function jqAutoPrompt(config: JqAutoPromptConfig): Promise<any> {
  const {
    dataFrame,
    lastError,
    onGetChat,
    onGetUserMessage,
    onJqString,
    onRetry,
    onShouldAbort,
    previousMessages = [],
    retryLeft = 3,
    getSystemMessage,
  } = config;

  const currentUserMessage: ChatMessage = { role: "user", content: onGetUserMessage({ lastError: lastError ? lastError : undefined }) };
  const systemMessage: ChatMessage = { role: "system", content: getSystemMessage({ dataFrame }) };
  const responseText = await onGetChat([systemMessage, ...previousMessages, currentUserMessage]);

  if (onShouldAbort?.()) {
    throw new Error("Aborted");
  }

  try {
    const jqString = responseText.match(/^jq\:\s*'(.+?)'/m)?.[1] ?? "";
    onJqString?.(jqString);

    if (!jqString) {
      const e = new Error(`Error parsing jq string with regex ${String.raw`/^jq\:\s*'(.+?)'/m`}`);
      e.stack = "";
      throw e;
    }

    const result = await promised.json(dataFrame, jqString);
    return result;
  } catch (e: any) {
    if (retryLeft <= 0) {
      // two messages per iteration
      throw new Error("Auto prompt engineering failed to converge. All retries used up");
    }

    const errorMessage = [e?.name, e?.message, e?.stack].filter(Boolean).join(" ").trim();
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
