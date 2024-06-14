import { JSONParser } from "@streamparser/json";
import type { ChatCompletionStreamProxy } from "../max/use-max-proxy";
import { ensureTokenLimit } from "../openai/tokens";

export const defaultContext = `Identify common themes across texts`;

export interface SyntheticFinding<T> {
  name: string;
  description: string;
  items: T[];
}

export interface SynthesizeStreamOptions<T> {
  items: T[];
  chatStreamProxy: ChatCompletionStreamProxy;
  goalOrInstruction: string | undefined;
  onStringify: (item: T) => string;
  abortSignal?: AbortSignal;
  onFinding?: (finding: SyntheticFinding<T>) => any;
}

export async function synthesizeStream<T>({
  items,
  chatStreamProxy,
  goalOrInstruction,
  onStringify,
  abortSignal,
  onFinding,
}: SynthesizeStreamOptions<T>): Promise<SyntheticFinding<T>[]> {
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
    },
    {
      signal: abortSignal,
    }
  );

  const parser = new JSONParser();
  const usedIds = new Set<number>();
  const parsingTask = Promise.withResolvers<SyntheticFinding<T>[]>();
  const findings: SyntheticFinding<T>[] = [];

  parser.onValue = (v) => {
    const finding = parseFinding<T>(v?.value);
    if (finding) {
      const items = finding.evidence.map((id) => {
        usedIds.add(id);
        return originalItems.find((item) => item.id === id)!.data;
      });

      const mappedFinding = { name: finding.name, description: finding.description, items };
      findings.push(mappedFinding);
      onFinding?.(mappedFinding);
    }
  };

  parser.onEnd = () => {
    const unusedItems = originalItems.filter((item) => !usedIds.has(item.id));
    if (unusedItems.length) {
      onFinding?.({
        name: "Unused",
        description: "Items not referenced in any finding",
        items: unusedItems.map((item) => item.data),
      });
    }

    parsingTask.resolve(findings);
  };

  for await (const response of result) {
    const chunkText = response.choices.at(0)?.delta?.content;
    if (chunkText) {
      parser.write(chunkText);
    }
  }

  return await parsingTask.promise;
}

interface ParsedFinding<T> {
  name: string;
  description: string;
  evidence: number[];
}
function parseFinding<T>(value?: any): ParsedFinding<T> | null {
  if (
    Object.getOwnPropertyNames(value as {})
      .sort()
      .join(",") === "description,evidence,name"
  ) {
    if (typeof value.name !== "string") throw new Error("Expected name string in finding");
    if (typeof value.description !== "string") throw new Error("Expected description string in finding");
    if (!Array.isArray(value.evidence)) throw new Error("Expected evidence array in finding");
    if (!value.evidence.every((id: any) => typeof id === "number")) throw new Error("Expected number in evidence array");

    return {
      name: value.name as string,
      description: value.description as string,
      evidence: value.evidence as number[],
    };
  } else {
    return null;
  }
}
