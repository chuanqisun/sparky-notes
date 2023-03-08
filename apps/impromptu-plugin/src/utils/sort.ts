export interface TopologicalGraph {
  nodeIds: string[];
  edges: SortableEdge[];
  hasCycle: boolean;
}

export interface SortableEdge {
  source: string;
  target: string;
}
export function topologicalSort(nodeIds: string[], edges: SortableEdge[]): TopologicalGraph {
  let hasCycle = false;

  const sortedNodeIds: string[] = [];
  const visitedNodes = new Set<string>();
  const visitingNodes = new Set<string>();

  const visit = (nodeId: string) => {
    if (visitedNodes.has(nodeId)) return;
    if (visitingNodes.has(nodeId)) {
      hasCycle = true;
      return;
    }

    visitingNodes.add(nodeId);
    const sourceNodes = edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => nodeIds.find((nodeId) => nodeId === edge.source))
      .filter(Boolean) as string[];

    sourceNodes.forEach((sourceNode) => visit(sourceNode));

    visitingNodes.delete(nodeId);
    visitedNodes.add(nodeId);
    sortedNodeIds.push(nodeId);
  };

  nodeIds.forEach((nodeId) => visit(nodeId));

  return {
    hasCycle,
    nodeIds: sortedNodeIds,
    edges,
  };
}
