import type { MessageToFigma, MessageToWeb } from "@sparky-notes/figma-ipc-types";
import { type ProxyToWeb } from "@sparky-notes/figma-tools";

export async function handleSetSelection(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.setSelection) return;

  const nodes = await Promise.all(message.setSelection.map((id) => figma.getNodeByIdAsync(id)));
  const validNodes = nodes.filter((node): node is BaseNode => node !== null);
  figma.currentPage.selection = [...validNodes] as SceneNode[];

  proxyToWeb.respond(message, {
    setSelectionResponse: validNodes.map((node) => node.id),
  });
}
