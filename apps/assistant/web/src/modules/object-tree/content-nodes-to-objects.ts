import type { ContentNode } from "@h20/assistant-types";

export function contentNodesToObject(contentNodes: ContentNode[] | null): any {
  if (contentNodes === null) {
    return null;
  }

  if (contentNodes.every((node) => node.type === "section")) {
    return contentNodes.reduce((acc, node) => {
      acc[node.content] = contentNodesToObject(node.children ?? []);
      return acc;
    }, {} as any);
  }

  return contentNodes.map(renderContentNode);
}

function renderContentNode(contentNode: ContentNode) {
  if (contentNode.type === "section") {
    return {
      [contentNode.content]: contentNodesToObject(contentNode.children ?? []),
    };
  } else {
    return contentNode.content;
  }
}
