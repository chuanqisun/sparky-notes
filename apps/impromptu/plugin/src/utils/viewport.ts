export function moveToViewportCenter(node: SceneNode) {
  node.x = figma.viewport.center.x - node.width / 2;
  node.y = figma.viewport.center.y - node.height / 2;
}

export function zoomToFit(nodes: SceneNode[]) {
  const previousZoom = figma.viewport.zoom;
  figma.viewport.scrollAndZoomIntoView(nodes);

  // only allow zoom out
  if (figma.viewport.zoom > previousZoom) {
    figma.viewport.zoom = previousZoom;
  }
}
