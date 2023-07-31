import type { RuntimePlugin } from "../../lang/runtime";

export function coreRenamePlugin(): RuntimePlugin {
  return {
    operator: "/rename",
    description: "Rename the current tab",
    run: async (_data, operand, context) => {
      context.setShelfName(operand);
      context.setStatus(`Shelf renamed to "${operand}"`);
    },
  };
}
