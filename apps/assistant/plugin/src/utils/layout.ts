export interface LayoutDraftOptions {
  layoutMode: "VERTICAL" | "HORIZONTAL";
  itemSpacing: number;
}
export function startLayoutDraftFrame(options: LayoutDraftOptions) {
  const frame = figma.createFrame();
  frame.clipsContent = true;
  frame.layoutMode = options.layoutMode;
  frame.itemSpacing = options.itemSpacing;
  frame.clipsContent = false;
  frame.opacity = 0;
  frame.setPluginData("isLayoutDraft", "true");

  return frame;
}

export function finishLayoutDraftFrame(frame: FrameNode) {
  if (frame.getPluginData("isLayoutDraft") !== "true") return;

  figma.ungroup(frame);
}
