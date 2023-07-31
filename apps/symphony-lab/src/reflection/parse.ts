import { jsonTreeWalk } from "./tree-walk";

export interface TypeNode {
  children?: Map<string | 0, TypeNode>;
  /** `undefined`, `null`, `array`, `object`, `number`, `string`, `boolean` */
  types: Set<string>;
  /** Based on prescence of the key. `undefined` will be considered required too */
  requiredKeys?: Set<string>;
}

export function parse(data: any): TypeNode {
  const missedRevisitKeys = new Map<TypeNode, Set<string>>();
  const visitedNodes = new Set<TypeNode>();

  const stack: TypeNode[] = [];
  let currentNode: TypeNode;

  // This guarantees that
  // 1. "visitLeaf" events will always be preceded by "openObject" events
  // 2. at least one "openObject" event will be emitted
  const events = jsonTreeWalk({ _: data });

  for (const event of events) {
    currentNode = stack[stack.length - 1];

    switch (event.eventType) {
      case "visitLeaf": {
        const key = typeof event.key === "number" ? 0 : event.key;
        const childNode = currentNode.children!.get(key) ?? { types: new Set() };
        childNode.types.add(event.valueType);

        // mark key as visited, if we are re-visiting
        if (key !== 0) missedRevisitKeys.get(currentNode)?.delete(key);

        currentNode.children!.set(key, childNode);
        break;
      }
      case "openObject": {
        const key = typeof event.key === "number" ? 0 : event.key;
        const openedNode = currentNode?.children?.get(key) ?? { types: new Set() };
        openedNode.children ??= new Map();
        openedNode.types.add(event.valueType);
        const isOpenObject = event.valueType === "object";

        // start tracking required re-visits on object
        if (isOpenObject) missedRevisitKeys.set(openedNode, new Set(openedNode.requiredKeys));

        currentNode?.children?.set(key, openedNode);
        stack.push(openedNode);
        break;
      }
      case "closeObject": {
        const closedNode = (currentNode = stack.pop()!);
        const isCloseObject = event.valueType === "object";

        if (isCloseObject) {
          // Delete missed keys from required keys
          const missedKeys = missedRevisitKeys.get(closedNode);
          missedKeys?.forEach((key) => {
            closedNode.requiredKeys?.delete(key);
            if (!closedNode.requiredKeys?.size) delete closedNode.requiredKeys;
          });

          // create required keys if closed object first time
          // infer required keys from children type
          if (!visitedNodes.has(closedNode)) {
            visitedNodes.add(closedNode);
            const requiredKeys = [...closedNode.children!.entries()].filter(([key, child]) => key !== 0 && child.types?.size).map(([key]) => key as string);
            if (requiredKeys.length) {
              closedNode.requiredKeys = new Set(requiredKeys);
            }
          }
        }
        break;
      }
    }
  }

  return currentNode!.children!.get("_")!;
}
