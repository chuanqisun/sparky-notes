import type { ContentNode } from "@sparky-notes/figma-ipc-types";

export interface IdContentNode {
  id: string;
  content: string;
  attachment?: {
    dataUrl: string;
    size: number;
  };
}

export async function contentNodesToIdContentNode(nodes: ContentNode[]): Promise<IdContentNode[]> {
  const resutls = await Promise.all(
    nodes.map(async (node) => {
      switch (node.type) {
        case "image":
          return [{ id: node.id, content: "<image>" }];
        case "sticky":
        case "text":
          return [{ id: node.id, content: node.content }];
        case "section":
          return contentNodesToIdContentNode(node.children ?? []);
        default:
          return [];
      }
    })
  );

  return resutls.flat();
}

export function getItemText(node: IdContentNode): string {
  return node.content;
}

export function getItemId(node: IdContentNode): string {
  return node.id;
}
