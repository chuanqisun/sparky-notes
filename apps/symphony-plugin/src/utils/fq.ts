import { getReachableGraph } from "./graph";
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

  connect(arrowDirection: "right" | "down" | "up") {
    let startMagnet: "RIGHT" | "BOTTOM" | "TOP";
    let endMagnet: "LEFT" | "TOP" | "BOTTOM";
    switch (arrowDirection) {
      case "right":
        startMagnet = "RIGHT";
        endMagnet = "LEFT";
        break;
      case "down":
        startMagnet = "BOTTOM";
        endMagnet = "TOP";
        break;
      case "up":
        startMagnet = "TOP";
        endMagnet = "BOTTOM";
        break;
    }

    this.nodes.reduce((previousNode, node) => {
      const connector = figma.createConnector();
      connector.connectorStart = {
        endpointNodeId: previousNode.id,
        magnet: startMagnet,
      };
      connector.connectorEnd = {
        endpointNodeId: node.id,
        magnet: endMagnet,
      };
      return node;
    });

    return this;
  }

  filter(predicate: (node: SceneNode) => boolean) {
    const consequentNodes = this.nodes.filter(predicate);
    return new FigmaQuery(consequentNodes);
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

  last() {
    return new FigmaQuery(this.nodes.slice(-1));
  }

  moveToViewCenter() {
    this.nodes.forEach((node) => {
      node.x = figma.viewport.center.x - node.width / 2;
      node.y = figma.viewport.center.y - node.height / 2;
    });

    return this;
  }

  moveToBottomCenter(target: SceneNode, gap: number) {
    if (!this.nodes.length) return this;

    const boundingMinX = Math.min(...this.nodes.map((node) => node.x));
    const boundingMaxX = Math.max(...this.nodes.map((node) => node.x + node.width));
    const boundingMidX = (boundingMaxX - boundingMinX) / 2;
    const boundingMinY = Math.min(...this.nodes.map((node) => node.y));

    const targetMidX = target.x + target.width / 2;
    const targetY = target.y + target.height + gap;

    const deltaX = targetMidX - boundingMidX;
    const deltaY = targetY - boundingMinY;

    this.nodes.forEach((node) => {
      node.x += deltaX;
      node.y += deltaY;
    });

    return this;
  }

  reachableGraphNodes() {
    const graph = getReachableGraph(this.nodes);
    return new FigmaQuery(graph.nodes);
  }

  remove() {
    this.nodes.forEach((node) => node.remove());
    return new FigmaQuery([]);
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
