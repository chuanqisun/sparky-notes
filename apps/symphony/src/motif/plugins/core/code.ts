import { getSample, getType } from "@h20/json-reflection";
import type { FnCallProxy } from "../../../openai/chat";
import type { RuntimePlugin } from "../../lang/runtime";
import { parseFunction } from "../../plugin-sdk/parse-function";

export function coreCodePlugin(fnCallProxy: FnCallProxy): RuntimePlugin {
  return {
    operator: "/code",
    description: "Write code to deterministically change the shelf",
    run: async (data, operand, context) => {
      context.setStatus("Interpreting...");

      fnCallProxy(
        [
          {
            role: "system",
            content: `
Design a function to transform the data based on the provided goal or instruction and sample data.
Write the function with the following signature:

function transform(input: InputType): any[]

${getType(data, { typeName: "InputType" })}

Serialize the source code as a single-line JSON string with newline and quotes escaped.
            `.trim(),
          },
          {
            role: "user",
            content: `Goal or instruction: ${operand}\n\nSample data:\n\n${getSample(data)}`,
          },
        ],
        {
          max_tokens: 1200,
          function_call: { name: "write_transform_fn" },
          functions: [
            {
              name: "write_transform_fn",
              description: "Write a javascript function",
              parameters: {
                type: "object",
                properties: {
                  functionString: {
                    type: "string",
                    description: "Single-line valid JSON string",
                  },
                },
                required: ["sourceJsonString"],
              },
            },
          ],
        }
      )
        .then((result) => {
          const parsedFunctionCall = JSON.parse(result.arguments);
          if (!parsedFunctionCall.functionString) throw new Error("Function call did not return `functionString`");
          const transformFn = parseFunction(parsedFunctionCall.functionString);
          console.log(`Function parsed: ${transformFn}`);

          context.setStatus("Executing...");
          const transformedData = transformFn(data);
          context.setItems(transformedData as any[]);
          context.setStatus("Done");
        })
        .catch((e) => {
          context.setStatus(`Error: ${e.message}`);
        });
    },
  };
}
