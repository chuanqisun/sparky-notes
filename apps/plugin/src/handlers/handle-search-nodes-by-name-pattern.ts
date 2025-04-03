import type { MessageToFigma, MessageToWeb } from "@sticky-plus/figma-ipc-types";
import { type ProxyToWeb } from "@sticky-plus/figma-tools";

export async function handleSearchNodesByNamePattern(message: MessageToFigma, proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  if (!message.searchNodesByNamePattern) return;

  const pattern = new RegExp(message.searchNodesByNamePattern, "i");

  const matchedNodes = figma.currentPage
    .findAllWithCriteria({ types: ["FRAME", "COMPONENT"] })
    .map((node) => {
      const matchResult = node.name.match(pattern);
      if (!matchResult) return false;
      return {
        id: node.id,
        name: node.name,
      };
    })
    .filter(Boolean as any as <T>(value: T | false) => value is T);

  proxyToWeb.respond(message, {
    searchNodesByNamePattern: matchedNodes,
  });
}
