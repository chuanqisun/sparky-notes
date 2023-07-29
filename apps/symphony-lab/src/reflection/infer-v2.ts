import assert from "node:assert";
import { jsonTreeWalk } from "./tree-walk";

export interface JsonTypeNode {
  children?: Map<string | 0, JsonTypeNode>;
  types?: Set<string>; // primitive for leaf node, `object` or `array` for parent node
}

export function getJsonTypeTree(data: any): JsonTypeNode {
  const requiredRevisitKeys = new Map<JsonTypeNode, Set<string | 0>>();
  const missedRevisitKeys = new Map<JsonTypeNode, Set<string | 0>>();

  const workingStack: JsonTypeNode[] = [];
  let currentNode: JsonTypeNode;

  // This guarantees that
  // 1. "visitLeaf" events will always be preceded by "openObject" events
  // 2. at least one "openObject" event will be emitted
  const events = jsonTreeWalk({ _: data });

  for (const event of events) {
    currentNode = workingStack[workingStack.length - 1];

    switch (event.eventType) {
      case "visitLeaf": {
        const key = typeof event.key === "number" ? 0 : event.key;
        const childNode = currentNode.children!.get(key) ?? {};
        childNode.types ??= new Set();
        childNode.types.add(event.valueType);

        // mark key as visited, if we are re-visiting
        missedRevisitKeys.get(currentNode)?.delete(key);

        currentNode.children!.set(key, childNode);
        break;
      }
      case "openObject": {
        const key = typeof event.key === "number" ? 0 : event.key;
        const openedNode = currentNode?.children?.get(key) ?? {};
        openedNode.children ??= new Map();
        openedNode.types ??= new Set();
        openedNode.types.add(event.valueType);

        // start tracking required re-visits
        const requiredKeysForNode = requiredRevisitKeys.get(openedNode);
        if (requiredKeysForNode) missedRevisitKeys.set(openedNode, new Set(requiredKeysForNode));

        currentNode?.children?.set(key, openedNode);
        workingStack.push(openedNode);
        break;
      }
      case "closeObject": {
        const closedNode = (currentNode = workingStack.pop()!);

        // // add `undefined` to newly introduced keys
        const previousRequiredKeys = requiredRevisitKeys.get(closedNode);
        if (previousRequiredKeys) {
          const newlyIntroducedKeys = [...closedNode.children!.keys()].filter((key) => !previousRequiredKeys.has(key));
          newlyIntroducedKeys.forEach((key) => closedNode.children!.get(key)!.types?.add("undefined"));
        }

        // add `undefined` to the missedKeys
        const missedKeys = missedRevisitKeys.get(closedNode);
        missedKeys?.forEach((key) => closedNode.children!.get(key)!.types?.add("undefined"));

        // infer required keys from children type
        const requiredKeys = [...closedNode.children!.entries()].filter(([_, child]) => child.types?.size && !child.types.has("undefined")).map(([key]) => key);
        requiredRevisitKeys.set(closedNode, new Set(requiredKeys));
        break;
      }
    }
  }

  return currentNode!.children!.get("_")!;
}

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

function mockNode(types?: string | string[], children?: Record<string | number, JsonTypeNode>): JsonTypeNode {
  const node: JsonTypeNode = {};
  if (types) node.types = new Set(Array.isArray(types) ? types : [types]);
  if (children) node.children = new Map(Object.entries(children)) as any;
  return node;
}
