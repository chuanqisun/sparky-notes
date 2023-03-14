export function getProgramNodeGraphHash(programNode: FrameNode, sourceNodes: SectionNode[], targetNodes: SectionNode[]): string {
  return hashCode([programNode, ...sourceNodes].map((node) => getNodeText(node)).join("")).toString() + targetNodes.map((node) => node.id).join("");
}

export function getNodeText(node: SceneNode): string {
  if (node.type === "TEXT") {
    return node.characters;
  }

  if (node.type === "STICKY") {
    return node.text.characters;
  }

  if ((node as ChildrenMixin).children) {
    return (node as ChildrenMixin).children.map((child) => getNodeText(child)).join("");
  }

  return "";
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
