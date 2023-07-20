import type { ChatProxy } from "../../account/model-selector";
import type { ShelfDirective } from "./base-directive";

export function createLensDirective(chat: ChatProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/lens"),
    run: async ({ source, data }) => {
      const lensPlan = source.slice("/lens".length).trim();

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

      const output = [1, 2, 3];

      return {
        data: output,
      };
    },
  };
}

type Lens = {
  read: () => any;
  write: (value: any) => any;
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
