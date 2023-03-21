export function getNodesDisplayName(nodes: readonly SceneNode[]) {
  switch (nodes.length) {
    case 0:
      return "N/A";
    case 1:
      return nodes[0].name;
    default:
      return "Mixed";
  }
}
