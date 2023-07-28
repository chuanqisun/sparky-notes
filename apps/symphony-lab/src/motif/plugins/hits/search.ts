import { getSemanticSearchInput, type SemanticSearchProxy } from "../../../hits/search-claims";
import type { FnCallProxy } from "../../../openai/chat";
import type { RuntimePlugin } from "../../lang/runtime";

export function hitsSearchPlugin(fnCallProxy: FnCallProxy, semanticSearchProxy: SemanticSearchProxy): RuntimePlugin {
  return {
    operator: "/hits/search",
    description: "Search HITS for UX insights",
    run: async (_data, operand, context) => {
      context.setStatus("Interpreting...");

      const paramsText = await fnCallProxy(
        [
          {
            role: "user",
            content: `Search ${operand}`,
          },
        ],
        {
          function_call: { name: "search_insights" },
          functions: [
            {
              name: "search_insights",
              description: "Search for UX insights",
              parameters: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Plaintext query only",
                  },
                  limit: {
                    type: "number",
                    description: "Number of items to return, max is 100",
                    default: 10,
                  },
                },
                required: ["query", "limit"],
              },
            },
          ],
        }
      );

      console.log("params text", paramsText);

      const { query, limit } = JSON.parse(paramsText.arguments);

      context.setStatus(`Searching top ${limit} insights: "${query}"`);
      const searchResults = await semanticSearchProxy(getSemanticSearchInput(query, limit));

      context.setStatus(`Done. Top ${searchResults.value?.length ?? 0} of ${searchResults["@odata.count"]}`);

      context.setItems(searchResults.value ?? []);
    },
  };
}
