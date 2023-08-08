import type { FnCallProxy } from "../../openai/proxy";
import type { ShelfPlugin } from "../runtime";

export function coreSummarizePlugin(fnCallProxy: FnCallProxy): ShelfPlugin {
  return {
    operator: "/summarize",
    description: "Summarize tabular data into a list of key points",
    run: async (operand, context) => {
      context.setStatus("Summarizing...");
      const data = context.getItems;

      fnCallProxy(
        [
          {
            role: "system",
            content: `
Summarize the provided data into a list of items based on the goal or instruction:

${JSON.stringify(data, null, 2)}
            `.trim(),
          },
          {
            role: "user",
            content: `Goal or instruction: ${operand}`,
          },
        ],
        {
          max_tokens: 1200,
          function_call: { name: "provide_summary" },
          functions: [
            {
              name: "provide_summary",
              description: "Provide the summary of the data",
              parameters: {
                type: "object",
                properties: {
                  summarized: {
                    type: "array",
                    description: "List of summarized items",
                    items: {
                      type: "string",
                    },
                  },
                },
                required: ["summarized"],
              },
            },
          ],
        }
      )
        .then((result) => {
          const parsedFunctionCall = JSON.parse(result.arguments);
          if (!parsedFunctionCall.summarized) throw new Error("Function call did not return `summarized`");
          const { summarized } = parsedFunctionCall;
          if (!Array.isArray(summarized)) throw new Error("`summarized` is not an array");

          context.setStatus(`Summarized ${data.length} items -> ${summarized.length} items`);
          context.setItems(summarized);
        })
        .catch((e) => {
          context.setStatus(`Error: ${e.message}`);
        });
    },
  };
}
