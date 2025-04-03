import { showUI } from "@sticky-plus/figma-tools";

export const openIndexPage = () => showUI(`${process.env.VITE_WEB_HOST}/index.html?t=${Date.now()}`, { height: 800, width: 420 });
export const openCardPage = (entityId: number | string, entityType: number | string) =>
  showUI(`${process.env.VITE_WEB_HOST}/card.html?entityId=${entityId}&entityType=${entityType}`, { height: 800, width: 420 });
