import type { FnCallProxy } from "../openai/proxy";
import { ensureTokenLimit } from "../openai/tokens";

export interface NamedInsight<T> {
  name: string;
  description: string;
  items: T[];
}

interface RawResult {
  findings: { name: string; description: string; evidence: number[] }[];
}

export async function synthesize<T>(fnCallProxy: FnCallProxy, items: T[], onStringify: (item: T) => string): Promise<NamedInsight<T>[]> {
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

  const safeCount = ensureTokenLimit(28_000, itemsYaml);

  const result = await fnCallProxy(
    [
      {
        role: "system",
        content: `Synthesize findings from evidence
        
Requirements:
- **two or more** evidence items per finding
- Provide name and a one-line description for each finding
- Each evidence can appear in zero, one, or multiple findings
- Discard unused evidence
          `.trim(),
      },
      {
        role: "user",
        content: itemsYaml,
      },
    ],
    {
      max_tokens: 200 + Math.round(safeCount * 1.5), // assume 200 token overhead + 1.5X expansion from input
      models: ["gpt-4", "gpt-4-32k"],
      temperature: 0.5,
      function_call: { name: "synthesize_findings" },
      functions: [
        {
          name: "synthesize_findings",
          description: "",
          parameters: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                description: `List of findings`,
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: `name of the finding`,
                    },
                    description: {
                      type: "string",
                      description: `description of the finding`,
                    },
                    evidence: {
                      type: "array",
                      description: `ids of evidence that support the finding`,
                      minItems: 2,
                      items: {
                        type: "number",
                      },
                    },
                  },
                  required: ["name", "description", "evidence"],
                },
              },
            },
            required: ["findings"],
          },
        },
      ],
    }
  );

  const parsedResults = JSON.parse(result.arguments) as RawResult;
  const mappedResults: NamedInsight<T>[] = parsedResults.findings.map((category) => ({
    name: category.name,
    description: category.description,
    items: category.evidence.map((id) => originalItems.find((item) => item.id === id)!.data).filter(Boolean),
  }));

  const unusedItems = originalItems.filter((item) => parsedResults.findings.every((cateogry) => !cateogry.evidence.includes(item.id)));
  if (unusedItems.length) {
    mappedResults.push({
      name: "Unused",
      description: "Items not used in any insight",
      items: unusedItems.map((item) => item.data),
    });
  }

  console.log("synthesized", mappedResults);

  return mappedResults;
}
