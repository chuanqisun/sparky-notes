import type { ShelfPlugin } from "../runtime";

export function coreRenameShelfPlugin(): ShelfPlugin {
  return {
    operator: "/rename",
    description: "Rename the current shelf",
    run: async (operand, context) => {
      context.setShelfName(operand);
      context.setStatus(`Renamed to "${operand}"`);
    },
  };
}

export function coreDeleteShelfPlugin(): ShelfPlugin {
  return {
    operator: "/delete",
    description: "Delete the current shelf",
    run: async (_operand, context) => {
      const currentTitle = context.getShelfName();
      context.deleteShelf();
      context.setStatus(`Deleted "${currentTitle}"`);
    },
  };
}
