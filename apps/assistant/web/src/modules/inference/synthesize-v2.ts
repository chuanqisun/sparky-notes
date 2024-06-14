import { JSONParser } from "@streamparser/json";
import type { ChatCompletionStreamProxy } from "../max/use-max-proxy";
import { ensureTokenLimit } from "../openai/tokens";

export interface NamedInsight<T> {
  name: string;
  description: string;
  items: T[];
}

export const defaultContext = `Identify common themes across texts`;

export async function synthesizeV2<T>(
  chatStreamProxy: ChatCompletionStreamProxy,
  items: T[],
  goalOrInstruction: string | undefined,
  onStringify: (item: T) => string,
  abortHandle?: string
) {
  const itemsWithIds = items.map((item, index) => ({ id: index + 1, data: onStringify(item) }));
  const originalItems = items.map((item, index) => ({ id: index + 1, data: item }));

  const itemsYaml = itemsWithIds
    .map((item) =>
      `
[id: ${item.id}]
${item.data}`.trim()
    )
    .join("\n\n");

  const safeCount = ensureTokenLimit(10_000, itemsYaml);
  const maxTokens = Math.min(4096, 200 + Math.round(safeCount * 2)); // assume 200 token overhead + 2X expansion from input
  console.log({ maxTokens, safeCount });

  const result = chatStreamProxy(
    {
      stream: true,
      max_tokens: maxTokens,
      temperature: 0.5,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `
Synthesize findings from evidence items based on this user goal: ${goalOrInstruction?.trim().length ? goalOrInstruction : defaultContext}

Cite *AS MANY AS POSSIBLE* evidence items id numbers to support each finding.

Respond in JSON format like this:
"""
{
  "findings": [
    {
      "name": "<name of the finding>",
      "description": "<one sentence description of this finding>",
      "evidence": [<id number>, <id number>, ...]
    },
    ...
  ]
}
"""
          `.trim(),
        },
        {
          role: "user",
          content: `

Evidence items:
${itemsYaml}
          `.trim(),
        },
      ],
    },
    {
      models: ["gpt-4o"],
    }
  );

  const parser = new JSONParser();
  parser.onValue = (v) => console.log(v);

  for await (const response of result) {
    const chunkText = response.choices.at(0)?.delta?.content;
    if (chunkText) {
      parser.write(chunkText);
    }
  }
}
