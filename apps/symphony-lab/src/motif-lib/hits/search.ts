import { getSemanticSearchInput, type SemanticSearchProxy } from "../../hits/search-claims";
import type { Plugin } from "../../motif-lang/runtime";
import type { FnCallProxy } from "../../openai/chat";

export function hitsSearch(fnCallProxy: FnCallProxy, semanticSearchProxy: SemanticSearchProxy): Plugin {
  return {
    operator: "/hits/search",
    description: "Search HITS for UX insights",
    run: async (data, operand, context) => {
      // parse operand into params: query, limit
      const searchResults = await semanticSearchProxy(getSemanticSearchInput(operand, 50));

      context.addItems(...(searchResults.value ?? []));
    },
  };
}
