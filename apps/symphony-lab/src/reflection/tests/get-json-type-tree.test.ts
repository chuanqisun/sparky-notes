import assert from "node:assert";
import { getJsonTypeTree, type JsonTypeNode } from "../get-json-type-tree";

assert.deepEqual(getJsonTypeTree(undefined), mockNode("undefined"));
assert.deepEqual(getJsonTypeTree(null), mockNode("null"));
assert.deepEqual(getJsonTypeTree(1), mockNode("number"));
assert.deepEqual(getJsonTypeTree("test"), mockNode("string"));

assert.deepEqual(getJsonTypeTree({}), mockNode("object", {}));
assert.deepEqual(getJsonTypeTree([]), mockNode("array", {}));

assert.deepEqual(getJsonTypeTree({ a: 1, b: "" }), mockNode("object", { a: mockNode("number"), b: mockNode("string") }));
assert.deepEqual(getJsonTypeTree([1, ""]), mockNode("array", { 0: mockNode(["number", "string"]) }));
assert.deepEqual(getJsonTypeTree([{ a: 1 }, { a: 2 }]), mockNode("array", { 0: mockNode("object", { a: mockNode("number") }) }));
assert.deepEqual(getJsonTypeTree([{ a: 1 }, { a: "" }]), mockNode("array", { 0: mockNode("object", { a: mockNode(["number", "string"]) }) }));
assert.deepEqual(getJsonTypeTree([{ a: 1 }, {}]), mockNode("array", { 0: mockNode("object", { a: mockNode(["number", "undefined"]) }) }));
assert.deepEqual(getJsonTypeTree([{}, { a: 1 }]), mockNode("array", { 0: mockNode("object", { a: mockNode(["number", "undefined"]) }) }));
assert.deepEqual(
  getJsonTypeTree([{ a: 1 }, { b: 1 }]),
  mockNode("array", { 0: mockNode("object", { a: mockNode(["number", "undefined"]), b: mockNode(["number", "undefined"]) }) })
);
assert.deepEqual(
  getJsonTypeTree([{ a: { x: 1 } }, { a: {} }]),
  mockNode("array", { 0: mockNode("object", { a: mockNode(["object", "undefined"], { x: mockNode(["number", "undefined"]) }) }) })
);
assert.deepEqual(
  getJsonTypeTree([{ a: { x: 1 } }, {}]),
  mockNode("array", { 0: mockNode(["object"], { a: mockNode(["object", "undefined"], { x: mockNode("number") }) }) })
);

function mockNode(types?: string | string[], children?: Record<string | number, JsonTypeNode>): JsonTypeNode {
  const node: JsonTypeNode = {};
  if (types) node.types = new Set(Array.isArray(types) ? types : [types]);
  if (children) node.children = new Map(Object.entries(children)) as any;
  return node;
}
