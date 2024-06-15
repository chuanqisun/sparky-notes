import type { ContentNode } from "@h20/assistant-types";

export interface IdContentNode {
  id: string;
  content: string;
}

export function contentNodestoIdContentNode(nodes: ContentNode[]): IdContentNode[] {
  return nodes.flatMap((node) => {
    if (node.type === "sticky") {
      return [{ id: node.id, content: node.content }];
    } else if (node.type === "section") {
      return contentNodestoIdContentNode(node.children ?? []);
    } else {
      return [];
    }
  });
}

export function getItemText(node: IdContentNode): string {
  return node.content;
}

export function getItemId(node: IdContentNode): string {
  return node.id;
}
