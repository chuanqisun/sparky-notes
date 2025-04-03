export function triggerResize(e: InputEvent) {
  Object.assign((e.target as any)?.closest("[data-resize-to-fit]")?.dataset ?? {}, { resizeToFit: (e.target as any)?.value });
}
