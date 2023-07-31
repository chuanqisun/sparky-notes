import { treeWalk } from "./tree-walk";

export interface TypeNode {
  children?: Map<string | 0, TypeNode>;
  /** `undefined`, `null`, `array`, `object`, `number`, `string`, `boolean` */
  types: Set<string>;
  /** Based on prescence of the key. `undefined` will be considered required too */
  requiredKeys?: Set<string>;
}

export function parse(data: any): TypeNode {
  const parentLinks = new Map<TypeNode, TypeNode>();
  const missedRevisitKeys = new Map<TypeNode, Set<string>>();
  const visitedNodes = new Set<TypeNode>();

  const stack: TypeNode[] = [];
  let currentNode: TypeNode;

  // This guarantees that
  // 1. "visitLeaf" events will always be preceded by "openObject" events
  // 2. at least one "openObject" event will be emitted
  const events = treeWalk({ _: data });

  for (const event of events) {
    currentNode = stack[stack.length - 1];

    switch (event.eventType) {
      case "visitLeaf": {
        const key = typeof event.key === "number" ? 0 : event.key;
        const childNode = currentNode.children!.get(key) ?? { types: new Set() };
        childNode.types.add(event.valueType);

        // mark key as visited, if we are re-visiting
        // note that when visiting leaf, the current node is actually the parent
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

        // track child-parent relationship
        parentLinks.set(openedNode, currentNode);

        // start tracking required re-visits on object
        if (isOpenObject) missedRevisitKeys.set(openedNode, new Set(openedNode.requiredKeys));

        currentNode?.children?.set(key, openedNode);
        stack.push(openedNode);
        break;
      }
      case "closeObject": {
        const closedNode = (currentNode = stack.pop()!);

        const isCloseKeyedChild = typeof event.key === "string";
        if (isCloseKeyedChild) {
          // since we don't emit visit on container nodes, we use close event to mark key as visited
          // mark key as visited from its parent
          const parent = parentLinks.get(closedNode);
          if (parent) missedRevisitKeys.get(parent)?.delete(event.key as string);
        }

        const isCloseKeyedParent = event.valueType === "object";

        if (isCloseKeyedParent) {
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
