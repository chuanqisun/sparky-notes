export function excludeNodes(excludeNodes: readonly SceneNode[]) {
  return (node: SceneNode) => excludeNodes.every((excludeNode) => node.id !== excludeNode.id);
}

export function selectOutEdges() {
  return (connector: AttachedConnector, sourceNode: SceneNode) => connector.connectorStart.endpointNodeId === sourceNode.id;
}
export function selectOutEdgesBelowStartNodes(startNodes: readonly SceneNode[]) {
  return (connector: AttachedConnector, sourceNode: SceneNode) => {
    const isOutEdge = connector.connectorStart.endpointNodeId === sourceNode.id;
    const isFromSource = startNodes.some((node) => node.id === connector.connectorStart.endpointNodeId);
    if (!isFromSource) {
      return isOutEdge;
    } else {
      return isOutEdge && connector.connectorStart.magnet === "BOTTOM";
    }
  };
}

export interface Traversal {
  onCollectNode: (node: SceneNode) => boolean;
  onConnector: (connector: AttachedConnector, sourceNode: SceneNode) => boolean;
  order: "pre" | "post";
}

export function traverse(sources: readonly SceneNode[], traversal: Traversal, results?: SceneNode[]): SceneNode[] {
  let workingResults = results ?? [];

  sources.forEach((node) => {
    if (traversal.order === "pre") !workingResults.some((foundNode) => foundNode.id === node.id) && traversal.onCollectNode(node) && workingResults.push(node);

    const allConnectors = node.attachedConnectors.filter(filterToAttachedMagnetConnector);
    const includedConnectors = allConnectors.filter((connector) => traversal.onConnector(connector, node));

    const targetNodes = includedConnectors
      .map((connector) => connector.connectorEnd.endpointNodeId)
      .map(figma.getNodeById)
      .filter(Boolean) as SceneNode[];

    traverse(targetNodes, traversal, workingResults);

    if (traversal.order === "post") !workingResults.some((foundNode) => foundNode.id === node.id) && traversal.onCollectNode(node) && workingResults.push(node);
  });

  return workingResults;
}

export interface Graph {
  nodeIds: string[];
  nodes: SceneNode[];
  edges: Edge[];
}
export interface Edge {
  id: string;
  source: string;
  target: string;
}

export function getReachableGraph(sources: readonly SceneNode[]): Graph {
  const foundEdges: Edge[] = [];
  const foundNodeIds: string[] = [];
  const foundNodes: SceneNode[] = [];

  const pendingNodes = [...sources];
  const isNotPending = (node: SceneNode) => pendingNodes.every((pendingNode) => pendingNode.id !== node.id);

  while (pendingNodes.length) {
    const node = pendingNodes.pop()!;
    if (foundNodeIds.includes(node.id)) continue;

    foundNodeIds.push(node.id);
    foundNodes.push(node);
    const outEdges = getOutEdges(node);
    foundEdges.push(...outEdges);
    const nextNodes = (outEdges.map(getEdgeTargetNode).filter(Boolean) as SceneNode[]).filter(isNotPending);
    pendingNodes.push(...nextNodes);
  }

  return {
    nodeIds: foundNodeIds,
    nodes: foundNodes,
    edges: foundEdges,
  };
}

function getInEdges(node: SceneNode): Edge[] {
  return node.attachedConnectors
    .filter(filterToAttachedMagnetConnector)
    .filter((connector) => connector.connectorEnd.endpointNodeId === node.id)
    .map((connector) => ({
      id: connector.id,
      source: connector.connectorStart.endpointNodeId,
      target: connector.connectorEnd.endpointNodeId,
    }));
}

function getOutEdges(node: SceneNode): Edge[] {
  return node.attachedConnectors
    .filter(filterToAttachedMagnetConnector)
    .filter((connector) => connector.connectorStart.endpointNodeId === node.id)
    .map((connector) => ({
      id: connector.id,
      source: connector.connectorStart.endpointNodeId,
      target: connector.connectorEnd.endpointNodeId,
    }));
}

function getEdgeSourceNode(edge: Edge): SceneNode | null {
  return figma.currentPage.findOne((node) => node.id === edge.source);
}

function getEdgeTargetNode(edge: Edge): SceneNode | null {
  return figma.currentPage.findOne((node) => node.id === edge.target);
}

export function getPrevNodes(currentNode: SceneNode): SceneNode[] {
  return getInEdges(currentNode).map(getEdgeSourceNode).filter(Boolean) as SceneNode[];
}

export function getNextNodes(currentNode: SceneNode): SceneNode[] {
  return getOutEdges(currentNode).map(getEdgeTargetNode).filter(Boolean) as SceneNode[];
}

export interface AttachedConnector extends ConnectorNode {
  connectorStart: ConnectorEndpointEndpointNodeIdAndMagnet;
  connectorEnd: ConnectorEndpointEndpointNodeIdAndMagnet;
}

export function filterToAttachedMagnetConnector(node: ConnectorNode): node is AttachedConnector {
  if (!(node.connectorStart as ConnectorEndpointEndpointNodeIdAndMagnet).magnet) return false;
  if (!(node.connectorEnd as ConnectorEndpointEndpointNodeIdAndMagnet).magnet) return false;
  return true;
}
