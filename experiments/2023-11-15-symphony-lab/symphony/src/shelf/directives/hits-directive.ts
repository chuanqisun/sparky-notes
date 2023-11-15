import { getSemanticSearchInput, type SemanticSearchProxy } from "../../hits/search-claims";
import type { ShelfDirective } from "./base-directive";

export function createHitsDirective(semanticSearchProxy: SemanticSearchProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/hits"),
    run: async (input) => {
      const searchText = input.source.slice("/hits".length).trim();

      const results = await semanticSearchProxy(getSemanticSearchInput(searchText, 50));

      try {
        return {
          data: results.value,
        };
      } catch {
        return {
          status: "Invalid JSON file",
        };
      }
    },
  };
}
