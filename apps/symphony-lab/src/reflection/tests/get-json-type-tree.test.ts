import assert from "node:assert";
import { getJsonTypeTree, type JsonTypeNode } from "../get-json-type-tree";

assertTypeTree(undefined, `root: undefined`); // normally, json would not have undefined
assertTypeTree(null, `root: null`);
assertTypeTree(1, `root: number`);
assertTypeTree("test", `root: string`);

assertTypeTree({}, `root: object`);
assertTypeTree([], `root: array`);

assertTypeTree(
  { a: 1, b: "" },
  `
root: object
requiredKeys: a, b
  a: number
  b: string
`
);
assertTypeTree(
  [1, ""],
  `
root: array
  0: number, string
`
);

assertTypeTree(
  [{}],
  `
root: array
  0: object
`
);
assertTypeTree(
  [[]],
  `
root: array
  0: array
`
);
assertTypeTree(
  [{}, []],
  `
root: array
  0: object, array
`
);
assertTypeTree(
  [{ a: 1 }, []],
  `
root: array
  0: object, array
  requiredKeys: a
    a: number
`
);
assertTypeTree(
  [{}, [1]],
  `
root: array
  0: object, array
    0: number
`
);
assertTypeTree(
  [1, "", {}, []],
  `
root: array
  0: number, string, object, array
`
);
assertTypeTree(
  [{ a: 1 }, ["test"]],
  `
root: array
  0: object, array
  requiredKeys: a
    a: number
    0: string
  `
);
assertTypeTree(
  [{ a: 1 }, { a: 2 }],
  `
root: array
  0: object
  requiredKeys: a
    a: number
  `
);
assertTypeTree(
  [{ a: 1 }, { a: "" }],
  `
root: array
  0: object
  requiredKeys: a
    a: number, string
  `
);
assertTypeTree(
  [{ a: 1 }, {}],
  `
root: array
  0: object
    a: number
  `
);
assertTypeTree(
  [{ a: 1 }, { a: undefined }],
  `
root: array
  0: object
  requiredKeys: a
    a: number, undefined
  `
);

assertTypeTree(
  [{}, { a: 1 }],
  `
root: array
  0: object
    a: number
  `
);
assertTypeTree(
  [{ a: 1 }, { b: 1 }],
  `
root: array
  0: object
    a: number
    b: number
`
);
assertTypeTree(
  [{ a: 1 }, {}, { a: 1 }],
  `
root: array
  0: object
    a: number
  `
);
assertTypeTree(
  [{}, { a: 1 }, {}],
  `
root: array
  0: object
    a: number
  `
);
assertTypeTree(
  [{ a: { x: 1 } }, { a: {} }],
  `
root: array
  0: object
    a: object
      x: number
  `
);
assertTypeTree(
  [{ a: { x: 1 } }, {}],
  `
root: array
  0: object
    a: object
    requiredKeys: x
      x: number
  `
);

function assertTypeTree(input: any, expected: string) {
  const actual = prettyPrintNodeLine(getJsonTypeTree(input)).join("\n");
  try {
    assert.strictEqual(actual, expected.trim());
  } catch (error) {
    console.error((error as any).name);
    console.log(`
=== Expected ===
${expected.trim()}

=== Actual ===
${actual}`);
  }
}

function mockNode(types: string | string[], children?: Record<string | number, JsonTypeNode>, requiredKeys?: string[]): JsonTypeNode {
  const node: JsonTypeNode = { types: new Set() };
  node.types = new Set(Array.isArray(types) ? types : [types]);
  if (children) node.children = new Map(Object.entries(children)) as any;
  if (requiredKeys) node.requiredKeys = new Set(requiredKeys);
  return node;
}

function prettyPrintNodeLine(node: JsonTypeNode, indent = 2, key: string | 0 = "root"): string[] {
  const selfOutput = [
    `${key}: ${Array.from(node.types).join(", ")}`,
    node.requiredKeys ? `requiredKeys: ${Array.from(node.requiredKeys ?? []).join(", ")}` : "",
  ].filter(Boolean) as string[];

  const childrenOutput = Array.from(node.children ?? []).flatMap(([key, childNode]) => {
    return [...prettyPrintNodeLine(childNode, indent, key)];
  });

  return [...selfOutput, ...childrenOutput.map((line) => `${" ".repeat(indent)}${line}`)];
}
