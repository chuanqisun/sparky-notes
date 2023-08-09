import type { FnCallProxy } from "../openai/proxy";

export interface GroupResult<T> {
  groups: {
    groupName: string;
    ids: string[];
  }[];
}
export async function group<T>(fnCallProxy: FnCallProxy, by: string, items: T[]): Promise<GroupResult<T>> {
  try {
    const result = await fnCallProxy(
      [
        {
          role: "system",
          content: `Group the items by ${by}. Give each group a name and respond the ids of items in each group.`,
        },
        {
          role: "user",
          content: JSON.stringify(items),
        },
      ],
      {
        max_tokens: 1000, // to estimate tokens
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
                          type: "string",
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

    console.log("group raw", result);
    return JSON.parse(result.arguments);
  } catch (e) {
    console.error(e);
    return {
      groups: [],
    };
  }
}
