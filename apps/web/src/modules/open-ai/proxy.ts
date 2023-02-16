const VITE_OPEN_AI_API_HOST = import.meta.env.VITE_OPEN_AI_API_HOST;

export interface OpenAIPromptPayload {
  prompt: string;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  best_of: number;
  max_tokens: number;
  stop: string | string[];
}

export type OpenAICompletionResponse = {
  choices: {
    text: string;
  }[];
  usage: {
    total_tokens: number;
  };
};

export type OpenAIProxy = (payload: OpenAIPromptPayload) => Promise<OpenAICompletionResponse>;

export function getOpenAIProxy(accessToken: string): OpenAIProxy {
  return async (payload: OpenAIPromptPayload) => {
    const result = await fetch(`${VITE_OPEN_AI_API_HOST}/completions`, {
      method: "post",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((res) => res.json());

    console.log(payload.prompt);

    return result;
  };
}

export async function submitTextPrompt(proxy: OpenAIProxy, prompt: string, config?: Partial<OpenAIPromptPayload>) {
  const response = await proxy({
    prompt,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    best_of: 1,
    max_tokens: 60,
    stop: "",
    ...config,
  });

  console.log("token usage", response.usage.total_tokens);

  return (response.choices?.[0].text as string) ?? "";
}
