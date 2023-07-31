import { getType } from "@h20/json-reflection";
import type { FnCallProxy } from "../../../openai/chat";
import type { RuntimePlugin } from "../../lang/runtime";

export function coreEachPlugin(fnCallProxy: FnCallProxy): RuntimePlugin {
  return {
    operator: "/core/each",
    description: "Work on one item at a time, with an optional focus on specific fields",
    run: async (data, operand, context) => {
      context.setStatus("Interpreting...");

      if (!Array.isArray(data)) {
        throw new Error("Expected an array");
      }

      const itemType = getType(data);
      debugger;

      const paramsText = await fnCallProxy(
        [
          {
            role: "system",
            content: `
Design a mapper function based on the provided instruction for each item. Respond a javascript function with the following signature:

function mapper(item: ItemType): Record<string, any>
            `.trim(),
          },
          {
            role: "user",
            content: `Each ${operand}`,
          },
        ],
        {
          function_call: { name: "write_mapper_fn" },
          functions: [
            {
              name: "write_mapper_fn",
              description: "Write a javascript function for Array.prototype.map",
              parameters: {
                type: "object",
                properties: {
                  mapperSourceCode: {
                    type: "string",
                    description: "Javascript source code for the function",
                  },
                },
                required: ["write_mapper_fn"],
              },
            },
          ],
        }
      );

      context.setItems(data);
    },
  };
}
