import type { FnCallProxy } from "../../openai/chat";
import { jsonToTyping } from "../../reflection/json-reflection";
import type { ShelfDirective } from "./base-directive";

export function createLensDirective(fnCall: FnCallProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/lens"),
    run: async ({ source, data }) => {
      const lensPlan = source.slice("/lens".length).trim();

      const result = await fnCall(
        [
          {
            role: "system",
            content: `
Based on the provided goal, define a javascript function that returns a list of accessors (getter and setter) to view or modify the data.

The function must use the following signature:

${TRIPLE_TICKS}
function transform(data: Root): ({get: () => GetterOutputType, set: (value: SettingInputType) => void)[]

${jsonToTyping(data, "Root")}
${TRIPLE_TICKS}

Make sure to strip out all types in the final response
                `.trim(),
          },
          {
            role: "user",
            content: lensPlan,
          },
        ],
        {
          functions: [
            {
              name: "define_transform_fn",
              description: "",
              parameters: {
                type: "object",
                properties: {
                  transformFnSrc: {
                    type: "string",
                    description: "The source code for the entire transform function",
                  },
                  getterOutputType: {
                    type: "string",
                    description: "Typescript definition for the getter's output",
                  },
                  setterInputType: {
                    type: "string",
                    description: "Typescript definition for the setter's input",
                  },
                },
                required: ["jsFunctionSrc"],
              },
            },
          ],
          function_call: { name: "define_transform_fn" },
          max_tokens: 1200,
          models: ["gpt-4"],
        }
      );

      /**
       * Pseudocode
       *
       * 1. schema := observe(data)
       * 2. selector := designSelector(schema, lensPlan)
       * 3. selection := applySelector(selector, data)
       * 4. selectionSchema = observe(selection)
       * 5. mapper := designMapper(selectionSchema, lensPlan)
       * 6. result := applyMapper(mapper, selector, data)
       */

      console.log(result);

      const parsed = JSON.parse(result.arguments) as Record<string, any>;
      console.log(parsed);

      const src = parsed.transformFnSrc as string;

      const functionParams =
        src
          ?.match(/function\s*.+?\((.+?)\)/m)?.[1]
          .trim()
          ?.split(",")
          .map((i) => i.trim())
          .filter(Boolean) ?? [];
      const functionBody = src?.match(/function\s*.+?\s*\{((.|\n)*)\}/m)?.[1].trim() ?? "";

      console.log({ functionParams, functionBody });
      const syntheticFunction = new Function(...[...functionParams, functionBody]);
      const accessorList = syntheticFunction(data);
      const resultList = accessorList.map((i: any) => i.get());

      // TODO perform LLM transformation if there is any /llm directive

      return {
        data: resultList,
      };
    },
  };
}

const TRIPLE_TICKS = "```";

type Lens = {
  read: () => any;
  write: (value: any) => void;
};

function llmTransform(input: any): any {}

function designLenses(data: any): Lens[] {
  /**
   * Implementation ideas:
   * - es6 proxy
   * - Object path tracking
   */

  /**
   * Write operations
   * - add child
   * - delete field
   * - update field
   */

  /**
   * How to deal with array vs object
   */

  return [];
}

function run(data: any) {
  const lenses = designLenses(data);

  for (const item of lenses) {
    const input = item.read();
    const output = llmTransform(input);
    item.write(output);
  }
}
