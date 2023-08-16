export interface Traversal {
  onPreVisit?: (node: SceneNode) => any;
  onPostVisit?: (node: SceneNode) => any;
  onShouldVisitChild?: (childNode: SceneNode, parentNode: SceneNode) => boolean;
}

export function walk(sources: readonly SceneNode[], traversal: Traversal) {
  sources.forEach((node) => {
    traversal.onPreVisit?.(node);

    const allChildren = (node as ChildrenMixin)?.children ?? [];
    const filteredChildren = allChildren.filter((child) => traversal.onShouldVisitChild?.(child, node) ?? true);

    walk(filteredChildren, traversal);

    traversal.onPostVisit?.(node);
  });
}
