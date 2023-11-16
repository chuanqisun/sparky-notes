import type { SelectionSummary } from "../../types/message";
import type { NotifyUI } from "../lib/notify-ui";

export const getSelectionChangeHandler = (config: { notifyUI: NotifyUI }) => () => {
  const selectedId = new Set(figma.currentPage.selection.map((node) => node.id));

  // currently only supports flat selection. Future version may support nesting
  const allTaggedNodes = figma.currentPage.findAllWithCriteria({
    pluginData: { keys: ["type"] },
  });

  const mutableSummary: SelectionSummary = {
    toolNodes: [],
    dataNodes: [],
  };

  allTaggedNodes.forEach((node) => {
    if (!selectedId.has(node.id)) return;

    const type = node.getPluginData("type");
    switch (type) {
      case "tool":
        return mutableSummary.toolNodes.push({ id: node.id });
      case "data":
        return mutableSummary.dataNodes.push({ id: node.id });
    }
  });

  config.notifyUI({ selectionChange: mutableSummary });
};
