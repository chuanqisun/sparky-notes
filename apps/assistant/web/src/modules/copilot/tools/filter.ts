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
        hint: "e.g. Is it alive?",
        isOptional: true,
      },
    ],
    run: async ({ args, shelf, setOutput }) => {
      const response = await filter(fnCallProxy, args["predicate"], shelf);
      console.log(response);
      setOutput(response);
    },
  };
}
