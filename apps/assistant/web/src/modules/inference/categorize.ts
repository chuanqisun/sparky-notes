import type { FnCallProxy } from "../openai/proxy";
import { ensureTokenLimit } from "../openai/tokens";

export interface NamedCategory<T> {
  name: string;
  items: T[];
}

interface RawResult {
  categories: { name: string; ids: number[] }[];
}

export async function categorize<T>(fnCallProxy: FnCallProxy, items: T[], onStringify: (item: T) => string): Promise<NamedCategory<T>[]> {
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
        content: `Categorize the items. Requirements:
- Provide a name for each category and reference item ids that belong to the categroy
- Only a single cohesive concept per cateogry
- Each item can belong to many categories (fuzzy clustering)
          `.trim(),
      },
      {
        role: "user",
        content: itemsYaml,
      },
    ],
    {
      max_tokens: 400, // TODO estimate tokens based on input size
      models: ["gpt-4", "gpt-4-32k"],
      function_call: { name: "respond_categories" },
      functions: [
        {
          name: "respond_categories",
          description: "",
          parameters: {
            type: "object",
            properties: {
              categories: {
                type: "array",
                description: `List of categories`,
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: `name of the category`,
                    },
                    ids: {
                      type: "array",
                      description: `ids of items belonging to the category`,
                      items: {
                        type: "number",
                      },
                    },
                  },
                  required: ["name", "ids"],
                },
              },
            },
            required: ["categories"],
          },
        },
      ],
    }
  );

  const parsedResults = JSON.parse(result.arguments) as RawResult;
  const mappedResults: NamedCategory<T>[] = parsedResults.categories.map((category) => ({
    name: category.name,
    items: category.ids.map((id) => originalItems.find((item) => item.id === id)!.data).filter(Boolean),
  }));

  const unusedItems = originalItems.filter((item) => parsedResults.categories.every((cateogry) => !cateogry.ids.includes(item.id)));
  if (unusedItems.length) {
    mappedResults.push({
      name: "Other",
      items: unusedItems.map((item) => item.data),
    });
  }

  console.log("categorized", mappedResults);

  return mappedResults;
}
