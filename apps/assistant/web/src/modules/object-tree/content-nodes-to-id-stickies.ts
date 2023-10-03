import type { ContentNode } from "@h20/assistant-types";

export interface IdSticky {
  id: string;
  content: string;
}

export function contentNodestoIdStickies(nodes: ContentNode[]): IdSticky[] {
  return nodes.flatMap((node) => {
    if (node.type === "sticky") {
      return [{ id: node.id, content: node.content }];
    } else if (node.type === "section") {
      return contentNodestoIdStickies(node.children ?? []);
    } else {
      return [];
    }
  });
}

export function getItemText(sticky: IdSticky): string {
  return sticky.content;
}

export function getItemId(sticky: IdSticky): string {
  return sticky.id;
}
