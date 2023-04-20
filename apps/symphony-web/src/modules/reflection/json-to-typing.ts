export function capitalizeFirstChar(text: string) {
  return text[0].toUpperCase() + text.slice(1);
}

export interface TypeNode {
  self: Record<string, string>;
  children: Record<string, TypeNode>;
}

// TODO this does not handle root array type
// TODO this does not handle recursive type
// TODO this does not support literal string enum type

export function reflectJsonAst(object: any): TypeNode {
  const typeDict: any = {};
  const additionalTypeDicts: any = {};

  Object.entries(object).map(([key, value]) => {
    switch (typeof object[key]) {
      case "object":
        if (object[key] === null) {
          typeDict[key] = "null";
        } else if (Array.isArray(object[key])) {
          typeDict[key] = `I${capitalizeFirstChar(key)}[]`;
          const childTypeNode = reflectJsonAst(object[key][0]);
          additionalTypeDicts[`I${capitalizeFirstChar(key)}`] = childTypeNode;
        } else {
          const childTypeNode = reflectJsonAst(object[key]);
          additionalTypeDicts[`I${capitalizeFirstChar(key)}`] = childTypeNode;
        }

        break;
      default:
        typeDict[key] = typeof object[key];
    }
  });

  return {
    self: typeDict,
    children: additionalTypeDicts,
  };
}

export function jsonTypeToTs(typeNode: TypeNode, parentName = "IRoot"): string {
  return [
    `Interface ${parentName} {
${Object.entries(typeNode.self)
  .map(([key, value]) => {
    return `  ${key}: ${value};`;
  })
  .join("\n")}
}`,
    ...Object.entries(typeNode.children).map(([key, value]) => {
      return jsonTypeToTs(value, key);
    }),
  ].join("\n\n");
}
