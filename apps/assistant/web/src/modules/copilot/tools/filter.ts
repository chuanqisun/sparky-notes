import { filter } from "../../inference/filter";
import type { FnCallProxy } from "../../openai/proxy";
import type { Tool } from "../tool";

export function filterTool(fnCallProxy: FnCallProxy): Tool {
  return {
    id: "core.filter",
    displayName: "Filter",
    parameters: [
      {
        displayName: "Predicate",
        key: "predicate",
        hint: "is a household object",
        isOptional: true,
      },
    ],
    run: async ({ args, shelf, update: updateShelf }) => {
      updateShelf((prev) => ({ ...prev, name: "Filtering..." }));
      const response = await filter(fnCallProxy, args["predicate"], shelf.data);
      console.log(response);
      updateShelf((prev) => ({ ...prev, name: `${shelf.name} filtered`, data: response.accepted }));
    },
  };
}
