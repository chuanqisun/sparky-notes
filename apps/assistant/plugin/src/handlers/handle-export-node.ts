import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { replaceNotification, type ProxyToWeb } from "@h20/figma-tools";

export async function handleExportNode(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.exportNode) return;

  replaceNotification("Exporting...");

  const node = figma.getNodeById(message.exportNode.id);
  (node as SceneNode)?.exportAsync({ format: "PNG" }).then((buffer) => {
    console.log(buffer);
    replaceNotification("Exported!", {
      timeout: 3000,
    });

    proxyToWeb.notify({
      exportedNodeResponse: {
        id: message.exportNode!.id,
        bytes: new Uint8Array(buffer), // TODO, need a thread safe way to pass bytes
        format: "PNG",
      },
    });
  });
}
