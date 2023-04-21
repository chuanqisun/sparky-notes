export function printJsonTyping(object: any): string {
  const ast = getJsonAst(object, "root");

  const emitResult = emitNode(ast);

  return [
    `type Root = ${emitResult.valueType};`,
    ...emitResult.interfaces.map(
      (emittedInterface) => `
interface ${emittedInterface.name} {
${emittedInterface.records.map((record) => `  ${record.key}: ${record.value};`).join("\n")}
}
  `
    ),
  ].join("\n\n");
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

interface EmittedNode {
  valueType: string; // TODO with keys path too?
  interfaces: EmittedInterface[];
}
interface EmittedInterface {
  keysPath: string[]; // TODO use this to get the correct interfacde name;
  name: string; // TODO deprecate
  records: { key: string; value: string }[];
}

function emitNode(node: JsonAstNode, parentKeysPath: string[] = []): EmittedNode {
  const currentKeysPath = [...parentKeysPath, node.key].filter(filterToNamedKey);

  if (node.type === "object") {
    const children = (node.children ?? []).map((child) => ({ key: child.key as string, emittedNode: emitNode(child, currentKeysPath) }));

    // FIXME, wrong name for array item

    const selfInterface: EmittedInterface = {
      keysPath: currentKeysPath,
      name: node.key as string, // TODO node.key can be number
      records: children.map(({ key, emittedNode }) => ({ key, value: emittedNode.valueType })),
    };

    const childrenInterfaces: EmittedInterface[] = children.flatMap(({ emittedNode }) => emittedNode.interfaces);
    return { valueType: selfInterface.name, interfaces: [selfInterface, ...childrenInterfaces] };
  } else if (node.type === "array") {
    const { valueType, interfaces } = emitNode(node.children![0], currentKeysPath); // TODO handle empty array
    return { valueType: `${valueType}[]`, interfaces };
  } else {
    return { valueType: node.type, interfaces: [] };
  }
}

function getInterfaceName(keysPath: (string | number)[]) {
  return `I${keysPath
    .filter(filterToNamedKey)
    .map((key) => capitalizeFirstChar(key))
    .join("")}`;
}

function capitalizeFirstChar(text: string): any {
  return text[0].toUpperCase() + text.slice(1);
}

function filterToNamedKey(key: string | number): key is string {
  return typeof key === "string";
}
