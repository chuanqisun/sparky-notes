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

export function closest<T extends SceneNode>(predicate: (node: SceneNode) => Boolean, node: SceneNode): null | T {
  if (predicate(node)) {
    return node as T;
  }

  if (!node.parent) return null;

  return closest<T>(predicate, node.parent as SceneNode); // TODO questionable typing
}
