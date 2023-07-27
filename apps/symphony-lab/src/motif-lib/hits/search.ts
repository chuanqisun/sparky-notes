import type { Plugin } from "../../motif-lang/runtime";

export function hitsSearch(): Plugin {
  return {
    operator: "/hits/search",
    description: "Search HITS for UX insights",
    run: async (data, operand, context) => {},
  };
}
