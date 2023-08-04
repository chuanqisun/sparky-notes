import { type RuntimePlugin } from "@h20/motif-lang";
import { type FnCallProxy } from "../sdk";

export function coreFilterPlugin(fnCallProxy: FnCallProxy): RuntimePlugin {
  return {
    operator: "/filter",
    description: "Keep any data that meets the provided condition",
    run: async (data, operand, context) => {
      context.setStatus("Interpreting...");

      if (!Array.isArray(data)) {
        throw new Error("Expected an array");
      }

      const progress = {
        total: data.length,
        keep: 0,
        reject: 0,
        error: 0,
      };

      const tasks = data.map((item) => {
        return async () => {
          return fnCallProxy(
            [
              {
                role: "system",
                content: `Check the provided data against this condition: "${operand}". Respond true/false`,
              },
              {
                role: "user",
                content: JSON.stringify(item),
              },
            ],
            {
              max_tokens: 200,
              function_call: { name: "respond_true_false" },
              functions: [
                {
                  name: "respond_true_false",
                  description: "",
                  parameters: {
                    type: "object",
                    properties: {
                      isTrue: {
                        type: "boolean",
                        description: `${operand}`,
                      },
                    },
                    required: ["isTrue"],
                  },
                },
              ],
            }
          )
            .then((result) => {
              const parsedArgs = JSON.parse(result.arguments);
              const conclusion = parsedArgs.isTrue as boolean;
              if (conclusion) {
                progress.keep++;
              } else {
                progress.reject++;
              }

              return conclusion;
            })
            .catch((e) => {
              progress.error++;
              console.error(e);
              return true; // conservative
            })
            .finally(() => {
              context.setStatus(`Filtering... (${progress.keep} keep, ${progress.reject} reject ${progress.error} error, ${progress.total} total)`);
            });
        };
      });

      try {
        const results = await Promise.all(tasks.map((task) => task()));
        const filteredData = data.filter((_, index) => results[index]);
        context.setItems(filteredData);
        context.setStatus(`Done (${progress.keep} keep, ${progress.reject} reject ${progress.error} error, ${progress.total} total)`);
      } catch (e) {
        context.setStatus(`Error: ${(e as any).message}`);
      }
    },
  };
}
