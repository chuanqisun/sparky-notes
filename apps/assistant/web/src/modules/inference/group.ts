import type { FnCallProxy } from "../openai/proxy";

export interface NamedGroup<T> {
  name: string;
  items: T[];
}

interface RawResult {
  groups: { name: string; ids: number[] }[];
}

export interface GroupConfig {
  by?: string;
  labels?: string[];
  count?: number;
}

function byClause(by?: string) {
  return by ? ` by ${by}` : "";
}

export async function group<T>(fnCallProxy: FnCallProxy, config: GroupConfig, items: T[]): Promise<NamedGroup<T>[]> {
  try {
    const itemsWithIds = items.map((item, index) => ({ id: index + 1, data: item }));

    const result = await fnCallProxy(
      [
        {
          role: "system",
          content: `Group the items${byClause(config.by)}. For each group, provide a name and item ids`,
        },
        {
          role: "user",
          content: JSON.stringify(itemsWithIds),
        },
      ],
      {
        max_tokens: 400, // TODO estimate tokens based on input size
        function_call: { name: "respond_groups" },
        functions: [
          {
            name: "respond_groups",
            description: "",
            parameters: {
              type: "object",
              properties: {
                groups: {
                  type: "array",
                  description: `List of groups`,
                  items: {
                    type: "object",
                    properties: {
                      name: {
                        type: "string",
                        description: `The name of the group`,
                      },
                      ids: {
                        type: "array",
                        description: `The ids of the items in the group`,
                        items: {
                          type: "number",
                        },
                      },
                    },
                    required: ["name", "ids"],
                  },
                },
              },
              required: ["groups"],
            },
          },
        ],
      }
    );

    const parsedResults = JSON.parse(result.arguments) as RawResult;
    const mappedResults: NamedGroup<T>[] = parsedResults.groups.map((group) => ({
      name: group.name,
      items: group.ids.map((id) => itemsWithIds.find((item) => item.id === id)!.data).filter(Boolean),
    }));

    console.log("grouped", mappedResults);

    return mappedResults;
  } catch (e) {
    console.error(e);
    return [];
  }
}
