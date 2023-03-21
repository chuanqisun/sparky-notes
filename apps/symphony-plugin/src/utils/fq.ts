import { closest } from "./query";

class FigmaQuery {
  static createFromNodes(nodes: readonly SceneNode[]) {
    return new FigmaQuery(nodes);
  }

  constructor(private nodes: readonly SceneNode[]) {}

  first() {
    return new FigmaQuery(this.nodes.slice(0, 1));
  }

  toNodes<T extends SceneNode>() {
    return [...this.nodes] as T[];
  }

  appendTo(parent: ChildrenMixin) {
    this.nodes.forEach((node) => parent.appendChild(node));
    return this;
  }

  center() {
    this.nodes.forEach((node) => {
      node.x = figma.viewport.center.x - node.width / 2;
      node.y = figma.viewport.center.y - node.height / 2;
    });

    return this;
  }

  fit() {
    const previousZoom = figma.viewport.zoom;
    figma.viewport.scrollAndZoomIntoView(this.nodes);

    // only allow zoom out
    if (figma.viewport.zoom > previousZoom) {
      figma.viewport.zoom = previousZoom;
    }

    return this;
  }

  setPluginData(dict: Record<string, any>) {
    this.nodes.forEach((node) => Object.entries(dict).forEach(([key, value]) => node.setPluginData(key, value)));
    return this;
  }

  closest(predicate: (node: SceneNode) => boolean) {
    const foundNodes = this.nodes.map((node) => closest(predicate, node)).filter(Boolean) as SceneNode[];
    return new FigmaQuery(foundNodes);
  }
}

export const $ = FigmaQuery.createFromNodes;
