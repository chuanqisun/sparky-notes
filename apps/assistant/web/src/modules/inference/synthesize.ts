import type { FnCallProxy } from "../openai/proxy";
import { ensureTokenLimit } from "../openai/tokens";

export interface NamedInsight<T> {
  name: string;
  description: string;
  items: T[];
}

interface RawResult {
  insights: { name: string; description: string; ids: number[] }[];
}

export async function synthesize<T>(fnCallProxy: FnCallProxy, items: T[], onStringify: (item: T) => string): Promise<NamedInsight<T>[]> {
  const itemsWithIds = items.map((item, index) => ({ id: index + 1, data: onStringify(item) }));
  const originalItems = items.map((item, index) => ({ id: index + 1, data: item }));

  const itemsYaml = itemsWithIds
    .map((item) =>
      `
[id: ${item.id}]
${item.data}`.trim()
    )
    .join("\n\n");

  ensureTokenLimit(28_000, itemsYaml);

  const result = await fnCallProxy(
    [
      {
        role: "system",
        content: `Identify insights from the items
        
Requirements:
- An insight must be based on common patterns from least 2 items
- Reference item ids that the insight is based on
- Provide name and description for each insight
- Each item can support multiple insights
          `.trim(),
      },
      {
        role: "user",
        content: itemsYaml,
      },
    ],
    {
      max_tokens: 1200, // TODO estimate tokens based on input size
      models: ["gpt-4", "gpt-4-32k"],
      function_call: { name: "identify_insights" },
      functions: [
        {
          name: "identify_insights",
          description: "",
          parameters: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                description: `List of insights`,
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: `name of the insight`,
                    },
                    description: {
                      type: "string",
                      description: `description of the insight`,
                    },
                    ids: {
                      type: "array",
                      description: `ids of items belonging to the insight`,
                      minItems: 2,
                      items: {
                        type: "number",
                      },
                    },
                  },
                  required: ["name", "theme", "ids"],
                },
              },
            },
            required: ["insights"],
          },
        },
      ],
    }
  );

  const parsedResults = JSON.parse(result.arguments) as RawResult;
  const mappedResults: NamedInsight<T>[] = parsedResults.insights.map((category) => ({
    name: category.name,
    description: category.description,
    items: category.ids.map((id) => originalItems.find((item) => item.id === id)!.data).filter(Boolean),
  }));

  const unusedItems = originalItems.filter((item) => parsedResults.insights.every((cateogry) => !cateogry.ids.includes(item.id)));
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
