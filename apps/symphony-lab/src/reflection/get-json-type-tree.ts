import { jsonTreeWalk } from "./tree-walk";

export interface JsonTypeNode {
  children?: Map<string | 0, JsonTypeNode>;
  types?: Set<string>; // primitive for leaf node, `object` or `array` for parent node
}

export function getJsonTypeTree(data: any): JsonTypeNode {
  const requiredRevisitKeys = new Map<JsonTypeNode, Set<string | 0>>();
  const missedRevisitKeys = new Map<JsonTypeNode, Set<string | 0>>();

  const stack: JsonTypeNode[] = [];
  let currentNode: JsonTypeNode;

  // This guarantees that
  // 1. "visitLeaf" events will always be preceded by "openObject" events
  // 2. at least one "openObject" event will be emitted
  const events = jsonTreeWalk({ _: data });

  for (const event of events) {
    currentNode = stack[stack.length - 1];

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
        stack.push(openedNode);
        break;
      }
      case "closeObject": {
        const closedNode = (currentNode = stack.pop()!);

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
