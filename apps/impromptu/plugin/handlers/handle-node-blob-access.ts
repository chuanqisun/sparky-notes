import type { MessageFromUI } from "../../types/message";
import type { NotifyUI } from "../lib/notify-ui";

export const handleGetNodeBlob = (config: { notifyUI: NotifyUI }) => (msg: MessageFromUI) => {
  if (msg.getNodeBlobById) {
    const node = figma.getNodeById(msg.getNodeBlobById);
    const blob = node?.getPluginData("blob");
    if (!blob) return;

    config.notifyUI({ nodeBlob: { id: msg.getNodeBlobById, blob } });
  }

  if (msg.setNodeBlob) {
    const node = figma.getNodeById(msg.setNodeBlob.id);
    node?.setPluginData("blob", msg.setNodeBlob.blob);
  }
};
