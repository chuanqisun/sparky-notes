import type { FnCallProxy } from "../../openai/proxy";
import type { ShelfPlugin } from "../runtime";

export function coreInferPlugin(fnCallProxy: FnCallProxy): ShelfPlugin {
  return {
    operator: "/infer",
    description: "Infer conclusion based on text",
    run: async (operand, context) => {
      context.setStatus("Interpreting...");
      const data = context.getItems;

      if (!Array.isArray(data)) {
        throw new Error("Expected an array");
      }

      const progress = {
        total: data.length,
        success: 0,
        error: 0,
      };

      const tasks = data.map((item) => {
        return async () => {
          return fnCallProxy(
            [
              {
                role: "system",
                content: `Infer "${operand}" from the provided data. Respond the conclusion in plaintext`,
              },
              {
                role: "user",
                content: JSON.stringify(item),
              },
            ],
            {
              max_tokens: 200,
              function_call: { name: "provide_inferred_conclusion" },
              functions: [
                {
                  name: "provide_inferred_conclusion",
                  description: "",
                  parameters: {
                    type: "object",
                    properties: {
                      conclusion: {
                        type: "string",
                        description: `${operand}`,
                      },
                    },
                    required: ["conclusion"],
                  },
                },
              ],
            }
          )
            .then((result) => {
              progress.success++;
              const parsedArgs = JSON.parse(result.arguments);
              const conclusion = parsedArgs.conclusion as string;
              return conclusion;
            })
            .catch((e) => {
              progress.error++;
              console.error(e);
              return "";
            })
            .finally(() => {
              context.setStatus(`Inferring... (${progress.success + progress.error}/${progress.total}, ${progress.error} errors)`);
            });
        };
      });

      try {
        const results = await Promise.all(tasks.map((task) => task()));
        context.setItems(results.map((item) => ({ displayName: "", data: item })));
        context.setStatus(`Done (${progress.success} successes, ${progress.error} errors, ${progress.total} total)`);
      } catch (e) {
        context.setStatus(`Error: ${(e as any).message}`);
      }
    },
  };
}
