import { getEmbeddingProxy } from "../azure/embedding";

export function bulkEmbed(texts: string[]): Promise<number[][]> {
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

  return Promise.all(texts.map((text) => embeddingProxy({ input: text }).then((res) => res.data[0].embedding)));
}
