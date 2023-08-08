import type { ProxyToWeb } from "@h20/figma-relay";
import type { MessageToFigma, MessageToWeb } from "@impromptu/types";
import type { WebMessageHandler } from "../main";
import { fq } from "../utils/fq";

export function selectionChanged(proxy: ProxyToWeb<MessageToWeb, MessageToFigma>): WebMessageHandler {
  return (message: MessageToFigma) => {
    if (!message.selectionChanged) return;

    const selectedData = fq(figma.currentPage.selection)
      .treeReachable()
      .filter((note) => note.type === "STICKY")
      .toNodes()
      .map((node) => JSON.parse(node.getPluginData("data")));

    proxy.notify({
      selectionChanged: {
        data: JSON.stringify(selectedData),
      },
    });
  };
}
