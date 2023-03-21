import { closest } from "./query";

class FigmaQuery {
  static createFromNodes(nodes: readonly SceneNode[]) {
    return new FigmaQuery(nodes);
  }

  constructor(private nodes: readonly SceneNode[]) {}

  align(edge: "top" | "vertical-center") {
    if (!this.nodes.length) return this;

    let alignReducer: (prevNode: SceneNode, node: SceneNode) => SceneNode;
    switch (edge) {
      case "top":
        alignReducer = (prevNode, node) => {
          node.y = prevNode.y;
          return node;
        };
        break;
      case "vertical-center":
        alignReducer = (prevNode, node) => {
          node.y = prevNode.y + (prevNode.height - node.height) / 2;
          return node;
        };
        break;
    }

    this.nodes.reduce(alignReducer);

    return this;
  }

  appendTo(parent: ChildrenMixin) {
    this.nodes.forEach((node) => parent.appendChild(node));
    return this;
  }

  closest(predicate: (node: SceneNode) => boolean) {
    const foundNodes = this.nodes.map((node) => closest(predicate, node)).filter(Boolean) as SceneNode[];
    return new FigmaQuery(foundNodes);
  }

  distribute(direction = "left-to-right", gap: number) {
    this.nodes.reduce<number | undefined>((topLeftX, node) => {
      if (topLeftX) {
        node.x = topLeftX;
      }

      return node.x + node.width + gap;
    }, undefined);

    return this;
  }

  first() {
    return new FigmaQuery(this.nodes.slice(0, 1));
  }

  fitInView() {
    const previousZoom = figma.viewport.zoom;
    figma.viewport.scrollAndZoomIntoView(this.nodes);

    // only allow zoom out
    if (figma.viewport.zoom > previousZoom) {
      figma.viewport.zoom = previousZoom;
    }

    return this;
  }

  connect(direction: "left-to-right") {
    this.nodes.reduce((previousNode, node) => {
      const connector = figma.createConnector();
      connector.connectorStart = {
        endpointNodeId: previousNode.id,
        magnet: "RIGHT",
      };
      connector.connectorEnd = {
        endpointNodeId: node.id,
        magnet: "LEFT",
      };
      return node;
    });

    return this;
  }

  moveToViewCenter() {
    this.nodes.forEach((node) => {
      node.x = figma.viewport.center.x - node.width / 2;
      node.y = figma.viewport.center.y - node.height / 2;
    });

    return this;
  }

  select() {
    figma.currentPage.selection = [...this.nodes];
    return this;
  }

  setPluginData(dict: Record<string, any>) {
    this.nodes.forEach((node) => Object.entries(dict).forEach(([key, value]) => node.setPluginData(key, value)));
    return this;
  }

  toNodes<T extends SceneNode>() {
    return [...this.nodes] as T[];
  }
}

export const $ = FigmaQuery.createFromNodes;
