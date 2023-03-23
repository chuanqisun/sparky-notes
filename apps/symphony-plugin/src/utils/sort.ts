import { getInConnectors, getOutConnectors } from "./graph";

// khan's algorithm for topological sorting, but in reverse order
// requires the graph to be acyclic
export function sortUpstreamNodes(startNodes: SceneNode[], reachableConnectorIds: Set<string>): SceneNode[] {
  const sortedList = [];
  const nodesWithNoOutConnectors = [...startNodes];
  const visitedEdgeIds = new Set<string>();

  while (nodesWithNoOutConnectors.length) {
    const node = nodesWithNoOutConnectors.pop()!;
    sortedList.unshift(node);

    const inEdges = getInConnectors(node);
    inEdges.forEach((edge) => visitedEdgeIds.add(edge.id));
    const inNodes = inEdges.map((edge) => figma.getNodeById(edge.connectorStart.endpointNodeId)).filter(Boolean) as SceneNode[];

    for (const inNode of inNodes) {
      if (
        getOutConnectors(inNode)
          .filter((edge) => reachableConnectorIds.has(edge.id))
          .every((edge) => visitedEdgeIds.has(edge.id))
      ) {
        nodesWithNoOutConnectors.push(inNode);
      }
    }
  }

  return sortedList;
}
