import { getType } from "@h20/json-reflection";
import { type RuntimePlugin } from "@h20/motif-lang";
import { parseFunctionDeclaration } from "../../openai/format";
import { type FnCallProxy } from "../sdk";

export function coreEachPlugin(fnCallProxy: FnCallProxy): RuntimePlugin {
  return {
    operator: "/each",
    description: "Work on one item at a time, with an optional focus on specific fields",
    run: async (data, operand, context) => {
      context.setStatus("Interpreting...");

      if (!Array.isArray(data)) {
        throw new Error("Expected an array");
      }

      const itemType = getType(data, { typeName: "ItemType", scope: "root-item" });

      const paramsText = await fnCallProxy(
        [
          {
            role: "system",
            content: `
Design a transform function based on the provided instruction for each item. It will called like this: someArray.map(transform)

Write the transform function in plain javascript with the following signature:

function transform(item: ItemType): Record<string, any>

${itemType}
            `.trim(),
          },
          {
            role: "user",
            content: `Each ${operand}`,
          },
        ],
        {
          models: ["gpt-4", "gpt-4-32k"],
          max_tokens: 600,
          function_call: { name: "write_transform_fn" },
          functions: [
            {
              name: "write_transform_fn",
              description: "Write a javascript function for Array.prototype.map",
              parameters: {
                type: "object",
                properties: {
                  serializedSourceCode: {
                    type: "string",
                    description: "Single-line valid JSON string of the source code",
                  },
                },
                required: ["write_transform_fn"],
              },
            },
          ],
        }
      );

      try {
        const parsedFunctionCall = JSON.parse(paramsText.arguments);
        if (!parsedFunctionCall.serializedSourceCode) throw new Error("Function call did not return `serializedSourceCode`");
        const transformFn = parseFunctionDeclaration(parsedFunctionCall.serializedSourceCode);
        console.log(`Function parsed: ${transformFn}`);
        const newData = data.map(transformFn) as any[];
        // merge with existing data
        // const merged = newData.map((item, index) => ({ ...data[index], ...item }));
        context.setItems(newData);
      } catch (e) {
        context.setStatus(`Error: ${(e as any).message}`);
      }
    },
  };
}
