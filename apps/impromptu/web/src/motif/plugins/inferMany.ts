import { type RuntimePlugin } from "@h20/motif-lang";
import { type FnCallProxy } from "../sdk";

export function coreInferManyPlugin(fnCallProxy: FnCallProxy): RuntimePlugin {
  return {
    operator: "/inferMany",
    description: "Infer multiple conclusions based on text",
    run: async (data, operand, context) => {
      context.setStatus("Interpreting...");

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
                content: `Infer a list of "${operand}" from the provided data. Respond conclusions in an array of strings`,
              },
              {
                role: "user",
                content: JSON.stringify(item),
              },
            ],
            {
              max_tokens: 200,
              function_call: { name: "provide_inferred_conclusions" },
              functions: [
                {
                  name: "provide_inferred_conclusions",
                  description: "",
                  parameters: {
                    type: "object",
                    properties: {
                      conclusion: {
                        type: "array",
                        description: `${operand}`,
                        items: {
                          type: "string",
                        },
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
        context.setItems(results);
        context.setStatus(`Done (${progress.success} successes, ${progress.error} errors, ${progress.total} total)`);
      } catch (e) {
        context.setStatus(`Error: ${(e as any).message}`);
      }
    },
  };
}
