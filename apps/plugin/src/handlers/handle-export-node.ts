import type { MessageToFigma, MessageToWeb } from "@sparky-notes/figma-ipc-types";
import { type ProxyToWeb } from "@sparky-notes/figma-tools";

export async function handleExportNode(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.exportNodes) return;

  const nodes = await Promise.all(
    message.exportNodes.ids.map(async (id) => {
      const node = await figma.getNodeByIdAsync(id);
      const width = (node as SceneNode)?.width ?? 0;
      const height = (node as SceneNode)?.height ?? 0;
      const largerDimension = width > height ? "WIDTH" : "HEIGHT";

      const buffer = await (node as SceneNode)?.exportAsync({
        format: "PNG",
        constraint: {
          type: largerDimension,
          value: 1080,
        },
      });

      return {
        id,
        buffer,
        mimeType: "image/png" as const,
      };
    })
  );

  proxyToWeb.respond(message, {
    exportNodesResponse: nodes,
  });
}
