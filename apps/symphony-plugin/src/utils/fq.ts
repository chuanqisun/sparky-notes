import { collectAllExcept, filterToAttachedMagnetConnector, selectOutEdgesBelowStartNodes, traverse } from "./graph";
import { graphHorizonalDefaultGap, graphVerticalDefaultGap } from "./layout";
import { canBeInnerOuter, closest, getAbsoluteBoundingBox, getBoundingNodes, isInnerOuter } from "./query";

export type ConnectorDirection = "left" | "right" | "up" | "down";
export type MagnetPosition = "TOP" | "BOTTOM" | "LEFT" | "RIGHT";

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

  filter(predicate: (node: SceneNode) => boolean) {
    const consequentNodes = this.nodes.filter(predicate);
    return new FigmaQuery(consequentNodes);
  }

  first() {
    return new FigmaQuery(this.nodes.slice(0, 1));
  }

  graphNext() {
    if (!this.nodes.length) return new FigmaQuery([]);

    const nextNodes = this.nodes.flatMap((refNode) =>
      refNode.attachedConnectors
        .filter(filterToAttachedMagnetConnector)
        .filter((connector) => connector.connectorStart.endpointNodeId === refNode.id)
        .map((outEdge) => figma.getNodeById(outEdge.connectorEnd.endpointNodeId)!)
        .filter(Boolean)
    ) as SceneNode[];

    return new FigmaQuery(nextNodes);
  }

  joinWithConnectors(connectorExitDirection: ConnectorDirection) {
    let startMagnet: MagnetPosition;
    let endMagnet: MagnetPosition;
    switch (connectorExitDirection) {
      case "right":
        startMagnet = "RIGHT";
        endMagnet = "LEFT";
        break;
      case "left":
        startMagnet = "LEFT";
        endMagnet = "RIGHT";
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

  last() {
    return new FigmaQuery(this.nodes.slice(-1));
  }

  moveToBottomLeft(target: SceneNode, gap = graphVerticalDefaultGap) {
    if (!this.nodes.length) return this;

    const boundingMinX = Math.min(...this.nodes.map((node) => node.x));
    const boundingMinY = Math.min(...this.nodes.map((node) => node.y));

    const targetMinX = target.x;
    const targetY = target.y + target.height + gap;

    const translateX = targetMinX - boundingMinX;
    const translateY = targetY - boundingMinY;

    return this.translate(translateX, translateY);
  }

  moveToGraphNextPosition(target: SceneNode, verticalGap = graphVerticalDefaultGap, horizontalGap = graphHorizonalDefaultGap) {
    if (!this.nodes.length) return this;

    const selfRect = getAbsoluteBoundingBox(this.nodes);
    const existingNextNodes = $([target]).graphNext().toNodes();

    if (!existingNextNodes.length) {
      return this.moveToBottomLeft(target, verticalGap);
    } else {
      const anchor = getBoundingNodes(getBoundingNodes(existingNextNodes).right).bottom[0]!;
      const translateX = anchor.x + anchor.width + horizontalGap - selfRect.x;
      const translateY = anchor.y - selfRect.y;

      return this.translate(translateX, translateY);
    }
  }

  moveToViewCenter() {
    const rect = getAbsoluteBoundingBox(this.nodes);
    const rectCenter = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
    const translateX = figma.viewport.center.x - rectCenter.x;
    const translateY = figma.viewport.center.y - rectCenter.y;

    return this.translate(translateX, translateY);
  }

  moveViewToCenter() {
    const rect = getAbsoluteBoundingBox(this.nodes);
    figma.viewport.center = {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    };
    return this;
  }

  remove() {
    this.nodes.forEach((node) => node.remove());
    return new FigmaQuery([]);
  }

  // Scroll the least distance to fit the selection. If impossible, zoom out to fit
  scrollOrZoomOutViewToContain(padding?: { top: number; right: number; bottom: number; left: number }) {
    const finalPadding = { top: 10, right: 10, bottom: 100, left: 10, ...padding }; // additional bottom distance due to figjam dock
    const rect = getAbsoluteBoundingBox(this.nodes);

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

  translate(x: number, y: number) {
    this.nodes.forEach((node) => {
      node.x += x;
      node.y += y;
    });
    return this;
  }

  zoomOutViewToContain() {
    if (!this.nodes.length) return this;

    const boundingBox = getAbsoluteBoundingBox(this.nodes);
    const viewportBox = figma.viewport.bounds;

    if (isInnerOuter(boundingBox, viewportBox)) return this;

    figma.viewport.scrollAndZoomIntoView(this.nodes);

    return this;
  }
}

export const $ = FigmaQuery.createFromNodes;
