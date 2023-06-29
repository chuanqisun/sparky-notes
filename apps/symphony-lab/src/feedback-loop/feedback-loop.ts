import type { ChatProxy } from "../account/model-selector";
import { type ChatMessage } from "../openai/chat";

export interface GetSystemMessageInput {
  input: any;
}

export interface GetUserMessageInput {
  lastError?: string;
}

export interface FeedbackLoopConfig {
  chat: ChatProxy;
  initialPrompt: string;
  input: any;
  lastError?: string;
  onGetErrorMessage: (error: string) => string;
  onGetSystemMessage?: (props: GetSystemMessageInput) => string;
  onJsString?: (jqString: string) => any;
  onRetry?: (errorMessage: string) => any;
  onShouldAbort?: () => boolean;
  onValidateResult?: (result: any) => any;
  previousMessages?: ChatMessage[];
  retryLeft?: number;
  systemPrompt: string;
}

export async function feedbackLoop(config: FeedbackLoopConfig): Promise<any> {
  const { lastError, chat, initialPrompt, onGetErrorMessage, systemPrompt, onRetry, onShouldAbort, previousMessages = [], retryLeft = 3 } = config;

  const currentUserMessage: ChatMessage = { role: "user", content: lastError ? onGetErrorMessage(lastError) : initialPrompt };
  const systemMessage: ChatMessage = {
    role: "system",
    content: systemPrompt,
  };
  const responseText = await chat([systemMessage, ...previousMessages, currentUserMessage]);

  if (onShouldAbort?.()) {
    throw new Error("Aborted");
  }

  try {
    // evaluate response
  } catch (e: any) {
    if (retryLeft <= 0) {
      throw new Error("Feedback loop failed to converge. All retries used up");
    }

    const errorMessage = [e?.name, e?.message ?? e?.stack].filter(Boolean).join(" ").trim();
    onRetry?.(errorMessage);

    return feedbackLoop({
      ...config,
      lastError: errorMessage,
      previousMessages: [...previousMessages, currentUserMessage, { role: "assistant", content: responseText }],
      retryLeft: retryLeft - 1,
    });
  }
}

export interface LoopConfig {
  dev: (history: Attempt[]) => any;
  test: (program: any) => any;
  /** @default 0 */
  retries?: number;

  /** @private */
  history: Attempt[];
}

export interface Attempt {
  program?: string;
  issue?: string;
}

export async function loop(props: LoopConfig) {
  const currentAttempt = props.history.at(-1)!;

  const program = await props.dev(props.history);
  const testResult = await props.test(program);

  currentAttempt.program = program;
  currentAttempt.issue = testResult?.issue;

  if (!currentAttempt.issue) {
    return program;
  } else {
    return loop({
      ...props,
      history: [...props.history, {}],
    });
  }
}
