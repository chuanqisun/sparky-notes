import type { NodeBlobChange } from "../../types/message";
import type { NotifyUI } from "../lib/notify-ui";

export const getDocumentChangeHandler = (config: { notifyUI: NotifyUI }) => (e: DocumentChangeEvent) => {
  const changes: NodeBlobChange[] = e.documentChanges
    .filter(isPropertyChange)
    .filter(isPluginDataChange)
    .map((change) => ({
      id: change.node.id,
      blob: (change.node as SceneNode).getPluginData("blob"),
    }));

  config.notifyUI({ nodeBlobChanges: changes });
};

function isPropertyChange(change: DocumentChange): change is PropertyChange {
  return change.type === "PROPERTY_CHANGE";
}

function isPluginDataChange(change: PropertyChange) {
  return change.properties.includes("pluginData");
}
