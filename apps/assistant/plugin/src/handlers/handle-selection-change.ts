import type { MessageToFigma, MessageToWeb, SelectedShelf } from "@h20/assistant-types";
import { walk, type ProxyToWeb } from "@h20/figma-tools";

export function handleSelectionChange(proxyToWeb: ProxyToWeb<MessageToWeb, MessageToFigma>) {
  const stickyNodes: StickyNode[] = [];
  const shelves: SelectedShelf[] = [];

  walk(figma.currentPage.selection, {
    onPreVisit: (candidate) => {
      if (candidate.type === "STICKY") {
        stickyNodes.push(candidate);
      }
      if (candidate.getPluginDataKeys().includes("shelfData") && candidate.type === "SHAPE_WITH_TEXT") {
        shelves.push({ id: candidate.id, rawData: candidate.getPluginData("shelfData"), name: candidate.name });
      }
    },
    onShouldVisitChild: (candidate) => candidate.type === "SECTION" || candidate.type === "STICKY" || candidate.type === "SHAPE_WITH_TEXT",
  });

  const stickies = stickyNodes.map((sticky) => ({
    id: sticky.id,
    text: sticky.text.characters.trim(),
    color: "",
  }));

  proxyToWeb.notify({ selectionChanged: { stickies, shelves } });
}
