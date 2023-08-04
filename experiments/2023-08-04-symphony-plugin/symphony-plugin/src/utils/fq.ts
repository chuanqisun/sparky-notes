import {
  collectAllExcept,
  connect,
  filterToAttachedMagnetConnector,
  matchConnectors,
  selectOutEdgesBelowStartNodes,
  traverse,
  type AttachedConnector,
  type ConnectorConfig,
  type MagnetPosition,
} from "./graph";
import { graphHorizonalDefaultGap, graphVerticalDefaultGap } from "./layout";
import { canBeInnerOuter, closest, getAbsoluteBoundingBox, getBoundingNodes, getEssentialAnchorNode, isInnerOuter } from "./query";
import { doesRectIntersect } from "./range";

export type Direction = "Up" | "Down" | "Left" | "Right";

export class FigmaQuery {
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

  chainWithConnectors(config: ConnectorConfig) {
    this.nodes.reduce((previousNode, node) => {
      connect(previousNode, node, config);
      return node;
    });

    return this;
  }

  closest(predicate: (node: SceneNode) => boolean) {
    const foundNodes = this.nodes.map((node) => closest(predicate, node)).filter(Boolean) as SceneNode[];
    return new FigmaQuery(foundNodes);
  }

  connectToNodes(targets: SceneNode[], config?: Partial<ConnectorConfig>) {
    const finalConfig: ConnectorConfig = { sourceMagnet: "BOTTOM", targetMagnet: "TOP", ...config };
    this.nodes.forEach((sourceNode) => targets.forEach((target) => connect(sourceNode, target, finalConfig)));
    return this;
  }

  connectFromNodes(sources: SceneNode[], config?: { sourceMaget?: MagnetPosition; targetMagnet?: MagnetPosition }) {
    const finalConfig: ConnectorConfig = { sourceMagnet: "BOTTOM", targetMagnet: "TOP", ...config };
    sources.forEach((sourceNode) => this.nodes.forEach((target) => connect(sourceNode, target, finalConfig)));
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

  graphUpstream(connectorPredicate?: (connector: AttachedConnector) => boolean) {
    if (!this.nodes.length) return new FigmaQuery([]);

    const prevNodes = this.nodes.flatMap((refNode) =>
      refNode.attachedConnectors
        .filter(filterToAttachedMagnetConnector)
        .filter((connector) => connector.connectorEnd.endpointNodeId === refNode.id)
        .filter(connectorPredicate ?? (() => true))
        .map((inEdge) => figma.getNodeById(inEdge.connectorStart.endpointNodeId)!)
        .filter(Boolean)
    ) as SceneNode[];

    return new FigmaQuery(prevNodes);
  }

  graphDownstream(connectorPredicate?: (connector: AttachedConnector) => boolean) {
    if (!this.nodes.length) return new FigmaQuery([]);

    const nextNodes = this.nodes.flatMap((refNode) =>
      refNode.attachedConnectors
        .filter(filterToAttachedMagnetConnector)
        .filter((connector) => connector.connectorStart.endpointNodeId === refNode.id)
        .filter(connectorPredicate ?? (() => true))
        .map((outEdge) => figma.getNodeById(outEdge.connectorEnd.endpointNodeId)!)
        .filter(Boolean)
    ) as SceneNode[];

    return new FigmaQuery(nextNodes);
  }

  last() {
    return new FigmaQuery(this.nodes.slice(-1));
  }

  hangBottomLeft(anchor: SceneNode, gap = graphVerticalDefaultGap) {
    if (!this.nodes.length) return this;
    const anchorBox = anchor.absoluteBoundingBox;
    if (!anchorBox) throw new Error("Missing bounding box");

    const subjectBox = getAbsoluteBoundingBox(this.nodes);
    const translateX = anchorBox.x - subjectBox.x;
    const translateY = anchorBox.y + anchor.height + gap - subjectBox.y;

    return this.translate(translateX, translateY);
  }

  hangRightTop(anchor: SceneNode, gap = graphHorizonalDefaultGap) {
    if (!this.nodes.length) return this;
    const anchorBox = anchor.absoluteBoundingBox;
    if (!anchorBox) throw new Error("Missing bounding box");

    const subjectBox = getAbsoluteBoundingBox(this.nodes);
    const translateX = anchorBox.x + gap + anchorBox.width - subjectBox.x;
    const translateY = anchorBox.y - subjectBox.y;

    return this.translate(translateX, translateY);
  }

  hangTopLeft(anchor: SceneNode, gap = graphVerticalDefaultGap) {
    if (!this.nodes.length) return this;
    const anchorBox = anchor.absoluteBoundingBox;
    if (!anchorBox) throw new Error("Missing bounding box");

    const subjectBox = getAbsoluteBoundingBox(this.nodes);
    const translateX = anchorBox.x - subjectBox.x;
    const translateY = anchorBox.y - subjectBox.y - subjectBox.height - gap;

    return this.translate(translateX, translateY);
  }

  hangLeftTop(anchor: SceneNode, gap = graphHorizonalDefaultGap) {
    if (!this.nodes.length) return this;
    const anchorBox = anchor.absoluteBoundingBox;
    if (!anchorBox) throw new Error("Missing bounding box");

    const subjectBox = getAbsoluteBoundingBox(this.nodes);
    const translateX = anchorBox.x - subjectBox.x - subjectBox.width - gap;
    const translateY = anchorBox.y - subjectBox.y;

    return this.translate(translateX, translateY);
  }

  moveToGraphTargetPosition(nodes: SceneNode[], verticalGap = graphVerticalDefaultGap, horizontalGap = graphHorizonalDefaultGap) {
    if (!this.nodes.length) return this;
    if (!nodes.length) return this;

    const selfRect = getAbsoluteBoundingBox(this.nodes);

    // candidate node should be lowest-left-most node
    const target = getBoundingNodes(getBoundingNodes(nodes).bottom).left[0];

    const existingNextNodes = $([target]).graphDownstream().toNodes();

    if (!existingNextNodes.length) {
      return this.hangBottomLeft(target, verticalGap);
    } else {
      const anchor = getBoundingNodes(getBoundingNodes(existingNextNodes).right).bottom[0]!;
      const translateX = anchor.x + anchor.width + horizontalGap - selfRect.x;
      const translateY = anchor.y - selfRect.y;

      return this.translate(translateX, translateY);
    }
  }

  moveToDirection(direction: Direction, anchorNodes: SceneNode[], verticalGap = graphVerticalDefaultGap, horizontalGap = graphHorizonalDefaultGap) {
    if (!this.nodes.length) return this;
    if (!anchorNodes.length) return this;

    const selfRect = getAbsoluteBoundingBox(this.nodes);

    const essentialAnchor = getEssentialAnchorNode(direction, anchorNodes)!;

    switch (direction) {
      case "Up": {
        const existingNodes = $([essentialAnchor])
          .graphUpstream(matchConnectors({ end: { magnet: "TOP" } }))
          .toNodes();

        if (!existingNodes.length) {
          return this.hangTopLeft(essentialAnchor, verticalGap);
        } else {
          // find right, find top, append right
          const anchor = getBoundingNodes(getBoundingNodes(existingNodes).right).top[0]!;
          const translateX = anchor.x + anchor.width + horizontalGap - selfRect.x;
          const translateY = anchor.y - selfRect.y;

          return this.translate(translateX, translateY);
        }
      }
      case "Down": {
        const existingNodes = $([essentialAnchor])
          .graphDownstream(matchConnectors({ start: { magnet: "BOTTOM" } }))
          .toNodes();

        if (!existingNodes.length) {
          return this.hangBottomLeft(essentialAnchor, verticalGap);
        } else {
          // find right, find bottom, append right
          const anchor = getBoundingNodes(getBoundingNodes(existingNodes).right).bottom[0]!;
          const translateX = anchor.x + anchor.width + horizontalGap - selfRect.x;
          const translateY = anchor.y - selfRect.y;

          return this.translate(translateX, translateY);
        }
      }
      case "Left": {
        const existingNodes = $([essentialAnchor])
          .graphUpstream(matchConnectors({ end: { magnet: "LEFT" } }))
          .toNodes();

        if (!existingNodes.length) {
          return this.hangLeftTop(essentialAnchor, horizontalGap);
        } else {
          // find bottom, find left, append below
          const anchor = getBoundingNodes(getBoundingNodes(existingNodes).bottom).left[0]!;
          const translateX = anchor.x - selfRect.x;
          const translateY = anchor.y + anchor.height + verticalGap - selfRect.y;

          return this.translate(translateX, translateY);
        }
      }
      case "Right": {
        const existingNodes = $([essentialAnchor])
          .graphDownstream(matchConnectors({ start: { magnet: "RIGHT" } }))
          .toNodes();

        if (!existingNodes.length) {
          return this.hangRightTop(essentialAnchor, horizontalGap);
        } else {
          // find bottom, find right, append below
          const anchor = getBoundingNodes(getBoundingNodes(existingNodes).bottom).right[0]!;
          const translateX = anchor.x - selfRect.x;
          const translateY = anchor.y + anchor.height + verticalGap - selfRect.y;

          return this.translate(translateX, translateY);
        }
      }
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

  setPluginData(dict: Record<string, string>) {
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

  // filter to nodes that intersects the viewport
  viewportIntersections() {
    const intersectNodes = this.nodes.filter((node) => node.absoluteBoundingBox && doesRectIntersect(node.absoluteBoundingBox, figma.viewport.bounds));
    return new FigmaQuery(intersectNodes);
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
