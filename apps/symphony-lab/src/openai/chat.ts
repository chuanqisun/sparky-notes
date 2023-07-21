import type { ChatInput, ChatMessage, ChatOutput } from "@h20/plex-chat";
export type { ChatMessage } from "@h20/plex-chat";

export type ChatProxy = (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => Promise<string>;
export type FnCallProxy = (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => Promise<{ arguments: string; name: string }>;

export type OpenAIChatPayload = ChatInput;

export interface SimpleModelConfig extends Partial<ChatInput> {
  models?: string[];
}

export type OpenAIChatResponse = ChatOutput;

export async function getChatResponse(
  apiKey: string,
  endpoint: string,
  messages: ChatMessage[],
  config?: Partial<OpenAIChatPayload>
): Promise<OpenAIChatResponse> {
  const payload = {
    messages,
    temperature: 0,
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
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    // console.log({
    //   title: `Chat ${result.usage.total_tokens} tokens`,
    //   messages: payload.messages,
    //   response: result,
    //   topChoice: result.choices[0].message?.content ?? "",
    //   tokenUsage: result.usage.total_tokens,
    // });

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

export interface ChatStreamItem {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    delta: {
      content?: string;
    };
    index: number;
    finish_reason: "stop" | "length" | "content_filter" | null;
  }[];
  usage: null;
}

export async function* getChatStream(
  apiKey: string,
  endpoint: string,
  messages: ChatMessage[],
  config?: Partial<OpenAIChatPayload>,
  abortSignal?: AbortSignal
): AsyncGenerator<ChatStreamItem> {
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

  const stream = await fetch(endpoint, {
    method: "post",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...payload, stream: true }),
    signal: abortSignal,
  }).catch((e) => {
    console.error(e);
    debugger;
    throw e;
  });

  if (!stream.ok) {
    throw new Error(`Request failed: ${[stream.status, stream.statusText, await stream.text()].join(" ")}`);
  }

  if (!stream.body) throw new Error("Request failed");

  const reader = stream.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    // Massage and parse the chunk of data
    const chunk = decoder.decode(value);
    const matches = chunk.matchAll(/^data: (\{.*\})$/gm);
    for (const match of matches) {
      yield JSON.parse(match[1]);
    }
  }
}
