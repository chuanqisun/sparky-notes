import type { ContentNode } from "@sparky-notes/figma-ipc-types";
import { proxyToFigma } from "./proxy";

export interface IdContentNode {
  id: string;
  content: string;
  attachments?: {
    dataUrl: string;
    mimeType: string;
  }[];
}

export async function contentNodesToIdContentNode(nodes: ContentNode[]): Promise<IdContentNode[]> {
  const imageDataMap = new Map<string, { dataUrl: string; mimeType: string }>();
  const imageIds = getImageNodeIds(nodes);
  if (imageIds.length) {
    const loadedImages = await proxyToFigma.request({
      exportNodes: {
        ids: getImageNodeIds(nodes),
      },
    });

    await Promise.all(
      (loadedImages.exportNodesResponse ?? []).map(async (image) => {
        const dataUrl = await bufferToDataUrl(image.buffer, image.mimeType);
        imageDataMap.set(image.id, { dataUrl, mimeType: image.mimeType });
      })
    );
  }

  const resutls = await Promise.all(
    nodes.map(async (node) => {
      switch (node.type) {
        case "image":
          const attachment = imageDataMap.get(node.id);
          return [
            {
              id: node.id,
              content: "<image>",
              attachments: attachment ? [attachment] : [],
            },
          ];
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

function getImageNodeIds(nodes: ContentNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === "image") {
      return [node.id];
    } else if (node.type === "section" && node.children) {
      return getImageNodeIds(node.children);
    }
    return [];
  });
}

async function bufferToDataUrl(buffer: Uint8Array, mimeType: string): Promise<string> {
  const blob = new Blob([buffer], { type: mimeType });
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });

  return dataUrl;
}
