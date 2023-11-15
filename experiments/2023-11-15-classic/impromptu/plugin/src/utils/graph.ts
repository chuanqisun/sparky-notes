import { filterToAttachedConnector } from "./query";
import { topologicalSort } from "./sort";

export interface Graph {
  nodeIds: string[];
  edges: Edge[];
}
export interface Edge {
  id: string;
  source: string;
  target: string;
}

export function getReachableGraph(sources: SceneNode[]): Graph {
  const foundEdges: Edge[] = [];
  const foundNodeIds: string[] = [];

  const pendingNodes = [...sources];
  const isNotPending = (node: SceneNode) => pendingNodes.every((pendingNode) => pendingNode.id !== node.id);

  while (pendingNodes.length) {
    const node = pendingNodes.pop()!;
    if (foundNodeIds.includes(node.id)) continue;

    foundNodeIds.push(node.id);
    const outEdges = getOutEdges(node);
    foundEdges.push(...outEdges);
    const nextNodes = (outEdges.map(getEdgeTargetNode).filter(Boolean) as SceneNode[]).filter(isNotPending);
    pendingNodes.push(...nextNodes);
  }

  return {
    nodeIds: foundNodeIds,
    edges: foundEdges,
  };
}

export function getSourceGraph(targets: SceneNode[]): Graph {
  const foundEdges: Edge[] = [];
  const foundNodeIds: string[] = [];

  const pendingNodes = [...targets];
  const isNotPending = (node: SceneNode) => pendingNodes.every((pendingNode) => pendingNode.id !== node.id);

  while (pendingNodes.length) {
    const node = pendingNodes.pop()!;
    if (foundNodeIds.includes(node.id)) continue;

    foundNodeIds.unshift(node.id);
    const inEdges = getInEdges(node);
    foundEdges.push(...inEdges);
    const nextNodes = (inEdges.map(getEdgeSourceNode).filter(Boolean) as SceneNode[]).filter(isNotPending);
    pendingNodes.push(...nextNodes);
  }

  return {
    nodeIds: foundNodeIds,
    edges: foundEdges,
  };
}

function getInEdges(node: SceneNode): Edge[] {
  return node.attachedConnectors
    .filter(filterToAttachedConnector)
    .filter((connector) => connector.connectorEnd.endpointNodeId === node.id)
    .map((connector) => ({
      id: connector.id,
      source: connector.connectorStart.endpointNodeId,
      target: connector.connectorEnd.endpointNodeId,
    }));
}

function getOutEdges(node: SceneNode): Edge[] {
  return node.attachedConnectors
    .filter(filterToAttachedConnector)
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

export function getExecutionOrder(sourceNodes: SceneNode[], cycleStartId: string) {
  if (!sourceNodes.length) return [];

  const reachable = getReachableGraph(sourceNodes);
  const topologicalNodes = topologicalSort(reachable.nodeIds, reachable.edges);
  const executionIds = topologicalNodes.nodeIds;

  if (!executionIds.includes(cycleStartId)) {
    console.log("Cycle start id is not part of the graph");
    return executionIds;
  }

  // rotate until first sourceNode is at the beginning
  if (topologicalNodes.hasCycle) {
    while (executionIds[0] !== cycleStartId) {
      executionIds.unshift(executionIds.pop()!);
    }
  }

  return executionIds;
}
