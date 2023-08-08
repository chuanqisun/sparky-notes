export interface EmbeddingOutput {
  object: "string";
  model: "string";
  data: [
    {
      index: number;
      object: "embedding";
      embedding: number[];
    }
  ];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export async function getEmbedding(apiKey: string, endpoint: string, input: string): Promise<EmbeddingOutput> {
  const result: EmbeddingOutput = await fetch(endpoint, {
    method: "post",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
  }).then((res) => res.json());

  return result;
}
