import type { RuntimePlugin } from "../../lang/runtime";

export function coreRenameShelfPlugin(): RuntimePlugin {
  return {
    operator: "/rename",
    description: "Rename the current shelf",
    run: async (_data, operand, context) => {
      context.setShelfName(operand);
      context.setStatus(`Renamed to "${operand}"`);
    },
  };
}

export function coreDeleteShelfPlugin(): RuntimePlugin {
  return {
    operator: "/delete",
    description: "Delete the current shelf",
    run: async (_data, _operand, context) => {
      const currentTitle = context.getShelfName();
      context.deleteShelf();
      context.setStatus(`Deleted "${currentTitle}"`);
    },
  };
}
