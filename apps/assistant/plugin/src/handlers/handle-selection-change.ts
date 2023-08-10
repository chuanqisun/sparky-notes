import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import { walk, type ProxyToWeb } from "@h20/figma-tools";

export function handleSelectionChange(proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  const ids = figma.currentPage.selection.map((node) => node.id);

  const stickyNodes: StickyNode[] = [];
  walk(figma.currentPage.selection, {
    onPreVisit: (candidate) => (candidate.type === "STICKY" ? stickyNodes.push(candidate) : 0),
    onChild: (candidate) => candidate.type === "SECTION" || candidate.type === "STICKY",
  });

  const stickies = stickyNodes.map((sticky) => ({
    id: sticky.id,
    text: sticky.text.characters.trim(),
    color: "",
  }));

  proxyToWeb.notify({ selectionChanged: { ids, stickies } });
}
