import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { replaceNotification, type ProxyToWeb } from "@h20/figma-tools";

export async function handleExportNode(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.exportNode) return;

  replaceNotification("Exporting...", {
    timeout: Infinity,
  });

  const node = await figma.getNodeByIdAsync(message.exportNode.id);
  (node as SceneNode)?.exportAsync({ format: "PNG" }).then((buffer) => {
    console.log({ exported: buffer });
    replaceNotification("Exported!", {
      timeout: 3000,
    });

    proxyToWeb.respond(message, {
      exportedNodeResponse: {
        id: message.exportNode!.id,
        buffer,
        format: "PNG",
      },
    });
  });
}
