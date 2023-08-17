import type { FnCallProxy } from "../openai/proxy";

export interface GroupResult<T> {
  groups: {
    groupName: string;
    items: T[];
  }[];
}

interface RawResult {
  groups: { groupName: string; ids: number[] }[];
}
export async function group<T>(fnCallProxy: FnCallProxy, by: string, items: T[]): Promise<GroupResult<T>> {
  try {
    const itemsWithIds = items.map((item, index) => ({ id: index + 1, data: item }));

    const result = await fnCallProxy(
      [
        {
          role: "system",
          content: `Group the items by ${by}. Give each group a name and respond the ids of items in each group.`,
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
                      groupName: {
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
                  },
                },
              },
              required: ["isTrue"],
            },
          },
        ],
      }
    );

    const parsedResults = JSON.parse(result.arguments) as RawResult;
    const mappedResults: GroupResult<T> = {
      groups: parsedResults.groups.map((group) => ({
        groupName: group.groupName,
        items: group.ids.map((id) => itemsWithIds.find((item) => item.id === id)!.data).filter(Boolean),
      })),
    };

    console.log("grouped", mappedResults);

    return mappedResults;
  } catch (e) {
    console.error(e);
    return {
      groups: [],
    };
  }
}
