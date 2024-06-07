import { ensureJsonResponse } from "../openai/ensure-json-response";
import type { PlexChatProxy } from "../openai/proxy";
import { ensureTokenLimit } from "../openai/tokens";

export interface NamedInsight<T> {
  name: string;
  description: string;
  items: T[];
}

export async function synthesize<T>(
  chatProxy: PlexChatProxy,
  items: T[],
  itemType: string | undefined,
  onStringify: (item: T) => string
): Promise<NamedInsight<T>[]> {
  const itemsWithIds = items.map((item, index) => ({ id: index + 1, data: onStringify(item) }));
  const originalItems = items.map((item, index) => ({ id: index + 1, data: item }));

  const itemsYaml = itemsWithIds
    .map((item) =>
      `
Evidence list

[id: ${item.id}]
${item.data}`.trim()
    )
    .join("\n\n");

  const safeCount = ensureTokenLimit(10_000, itemsYaml);
  const maxTokens = 200 + Math.round(safeCount * 2); // assume 200 token overhead + 2X expansion from input
  if (maxTokens > 32_000) throw new Error("Content exceeds max token limit. Reduce the selection and retry.");
  console.log({ maxTokens, safeCount });

  const result = await chatProxy({
    input: {
      max_tokens: maxTokens,
      temperature: 0.5,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content: `Synthesize findings from evidence items.${itemType ? ` Each item is ${itemType}.` : ""}
        
Requirements:
- **two or more** evidence items per finding
- Provide name and a one-line description for each finding
- Cite the evidence item's id number
- Each evidence can appear in multiple findings

Respond in JSON format like this:
"""
{
  "findings": [
    {
      "name": "<name of the finding>",
      "description": "<description of the finding>",
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
          content: itemsYaml,
        },
      ],
    },
    context: {
      models: ["gpt-4o"],
    },
  }).then((response) =>
    ensureJsonResponse((rawResponse) => {
      if (!Array.isArray(rawResponse?.findings)) throw new Error("Expected findings array");

      const mappedResults = (rawResponse.findings as any[]).map((finding) => {
        if (typeof finding.name !== "string") {
          throw new Error("Expected name string in each finding");
        }

        if (typeof finding.description !== "string") {
          throw new Error("Expected description string in each finding");
        }

        if (!Array.isArray(finding.evidence)) {
          throw new Error("Expected evidence array in each finding");
        }

        return {
          name: finding.name as string,
          description: finding.description as string,
          items: (finding.evidence as any[]).map((id) => {
            if (typeof id !== "number") {
              throw new Error("Expected number in evidence array");
            }

            return originalItems.find((item) => item.id === id)!.data;
          }),
        };
      });

      const unusedItems = originalItems.filter((item) => mappedResults.every((cateogry) => !cateogry.items.includes(item.data)));
      if (unusedItems.length) {
        mappedResults.push({
          name: "Unused",
          description: "Items not used in any insight",
          items: unusedItems.map((item) => item.data),
        });
      }

      console.log("synthesized", mappedResults);

      return mappedResults;
    }, response)
  );

  return result;
}
