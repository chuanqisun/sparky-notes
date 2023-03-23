import { collectAllExcept, selectOutEdgesBelowStartNodes, traverse } from "./graph";
import { canBeInnerOuter, closest, getAbsoluteBoundingRect, isInnerOuter } from "./query";

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

  distribute(direction = "left-to-right", gap: number) {
    this.nodes.reduce<number | undefined>((topLeftX, node) => {
      if (topLeftX) {
        node.x = topLeftX;
      }

      return node.x + node.width + gap;
    }, undefined);

    return this;
  }

  filter(predicate: (node: SceneNode) => boolean) {
    const consequentNodes = this.nodes.filter(predicate);
    return new FigmaQuery(consequentNodes);
  }

  first() {
    return new FigmaQuery(this.nodes.slice(0, 1));
  }

  last() {
    return new FigmaQuery(this.nodes.slice(-1));
  }

  moveToBottomLeft(target: SceneNode, gap: number) {
    if (!this.nodes.length) return this;

    const boundingMinX = Math.min(...this.nodes.map((node) => node.x));
    const boundingMinY = Math.min(...this.nodes.map((node) => node.y));

    const targetMinX = target.x;
    const targetY = target.y + target.height + gap;

    const deltaX = targetMinX - boundingMinX;
    const deltaY = targetY - boundingMinY;

    this.nodes.forEach((node) => {
      node.x += deltaX;
      node.y += deltaY;
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

  moveViewToCenter() {
    const rect = getAbsoluteBoundingRect(this.nodes);
    figma.viewport.center = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
    return this;
  }

  // Scroll the least distance to fit the selection. If impossible, zoom out to fit
  scrollOrZoomOutViewToContain(padding?: { top: number; right: number; bottom: number; left: number }) {
    const finalPadding = { top: 10, right: 10, bottom: 10, left: 10, ...padding };
    const rect = getAbsoluteBoundingRect(this.nodes);

    const viewportBox = figma.viewport.bounds;

    if (!canBeInnerOuter(rect, viewportBox)) {
      figma.viewport.scrollAndZoomIntoView(this.nodes);
      return this;
    }
    // now we can guarantee a fit

    const targetMinX = rect.x - finalPadding.left;
    const targetMinY = rect.y - finalPadding.top;
    const targetMaxX = rect.x + rect.width + finalPadding.right;
    const targetMaxY = rect.y + rect.height + finalPadding.bottom;

    const viewportMinX = figma.viewport.bounds.x;
    const viewportMinY = figma.viewport.bounds.y;
    const viewportMaxX = figma.viewport.bounds.x + figma.viewport.bounds.width;
    const viewportMaxY = figma.viewport.bounds.y + figma.viewport.bounds.height;

    // we at least one of them is 0 because of fit check
    const translateXContainRight = Math.max(0, targetMaxX - viewportMaxX);
    const translateXContainLeft = Math.min(0, targetMinX - viewportMinX);

    const translateYContainTop = Math.min(0, targetMinY - viewportMinY);
    const translateYContainBottom = Math.max(0, targetMaxY - viewportMaxY);

    figma.viewport.center = {
      x: figma.viewport.center.x + translateXContainRight + translateXContainLeft,
      y: figma.viewport.center.y + translateYContainBottom + translateYContainTop,
    };

    return this;
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

  /** all reachable nodes below the selected nodes */
  subtree() {
    const results: SceneNode[] = [];

    traverse(this.nodes, {
      onPreVisit: collectAllExcept(this.nodes, results),
      onConnector: selectOutEdgesBelowStartNodes(this.nodes),
    });

    return new FigmaQuery(results);
  }

  toNodes<T extends SceneNode>() {
    return [...this.nodes] as T[];
  }

  zoomOutViewToContain() {
    if (!this.nodes.length) return this;

    const boundingBox = getAbsoluteBoundingRect(this.nodes);
    const viewportBox = figma.viewport.bounds;

    if (isInnerOuter(boundingBox, viewportBox)) return this;

    figma.viewport.scrollAndZoomIntoView(this.nodes);

    return this;
  }
}

export const $ = FigmaQuery.createFromNodes;
