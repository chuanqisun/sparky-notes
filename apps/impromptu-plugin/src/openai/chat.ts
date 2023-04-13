export interface OpenAIChatPayload {
  messages: ChatMessage[];
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  stop: string | string[];
}

export type ChatModel = "v3.5-turbo" | "v4-8k" | "v4-32k";

export interface OpenAIChatPayloadWithModel extends OpenAIChatPayload {
  /** @default "v3.5-turbo" */
  model?: ChatModel;
}

export interface ChatMessage {
  role: "assistant" | "user" | "system";
  content: string;
}

export type OpenAIChatResponse = {
  choices: {
    finish_reason: "stop" | "length" | "content_filter" | null;
    index: number;
    message: {
      content?: string; // blank when content_filter is active
      role: "assistant";
    };
  }[];
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
};

export function modelToEndpoint(model?: ChatModel): string {
  switch (model) {
    case "v4-32k":
      return process.env.VITE_OPENAI_CHAT_ENDPOINT_V4_32K!;
    case "v4-8k":
      return process.env.VITE_OPENAI_CHAT_ENDPOINT_V4_8K!;
    case "v3.5-turbo":
    default:
      return process.env.VITE_OPENAI_CHAT_ENDPOINT!;
  }
}

export type ChatProxy = (
  messages: ChatMessage[],
  config: Partial<OpenAIChatPayloadWithModel> & Pick<OpenAIChatPayloadWithModel, "model">
) => Promise<OpenAIChatResponse>;

export async function getChatResponse(
  accessToken: string,
  endpoint: string,
  messages: ChatMessage[],
  config?: Partial<OpenAIChatPayload>
): Promise<OpenAIChatResponse> {
  const payload = {
    messages,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 60,
    stop: "",
    ...config,
  };

  try {
    const result: OpenAIChatResponse = await fetch(endpoint, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    console.log({
      title: `Chat ${result.usage.total_tokens} tokens`,
      messages: payload.messages,
      response: result,
      topChoice: result.choices[0].message?.content ?? "",
      tokenUsage: result.usage.total_tokens,
    });

    return result;
  } catch (e) {
    console.error({
      title: `Completion error`,
      messages: payload.messages,
      error: `${(e as Error).name} ${(e as Error).message}`,
    });
    throw e;
  }
}
