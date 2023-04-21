export function printJsonTyping(object: any): string {
  const ast = getJsonAst(object, "root");

  const emitResult = emitNode(ast);

  return [`type Root = ${emitResult[0]};`, ...emitResult[1]].join("\n\n");
}

export interface JsonAstNode {
  key: string | number;
  type: string;
  children?: JsonAstNode[];
}
export function getJsonAst(object: any, key: string | number): JsonAstNode {
  const type = typeof object;
  switch (type) {
    case "object":
      if (object === null) {
        return { key, type: "null" };
      } else if (Array.isArray(object)) {
        return {
          key,
          type: "array",
          children: [getJsonAst(object[0], 0)],
        };
      } else {
        return {
          key,
          type: "object",
          children: Object.entries(object).map(([key, value]) => {
            return getJsonAst(value, key);
          }),
        };
      }
    default:
      return { key, type };
  }
}

interface Interface {
  name: string;
  dict: Record<string, string>;
}

function emitNode(node: JsonAstNode): [valueType: string, interfaces: string[]] {
  if (node.type === "object") {
    const children = (node.children ?? []).map((child) => [child.key as string, emitNode(child)]);
    const selfInterface = `interface ${getInterfaceName(node)} {
${children.map(([key, [valueType, _]]) => `  ${key}: ${valueType}`).join("\n")}
}`;

    const childrenInterfaces = children.flatMap(([_childKey, [_childValueType, interfaces]]) => interfaces);
    return [getInterfaceName(node), [selfInterface, ...childrenInterfaces]];
  } else if (node.type === "array") {
    const [innerValueType, innerInterfaces] = emitNode(node.children![0]); // TODO handle empty array
    return [`${innerValueType}[]`, innerInterfaces];
  } else {
    return [node.type, []];
  }
}

function getInterfaceName(node: JsonAstNode) {
  return `I${capitalizeFirstChar(node.key as string)}`;
}

function capitalizeFirstChar(text: string): any {
  return text[0].toUpperCase() + text.slice(1);
}
