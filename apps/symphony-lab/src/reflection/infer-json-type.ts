import { type TreeWalkEvent } from "./tree-walk";

export interface JsonTypeNode {
  key: string | number;
  typeHash: string;
  children?: JsonTypeNode[];
  type?: string;
}

export function inferJsonType(treeWalkEvents: Generator<TreeWalkEvent>): JsonTypeNode {
  const root: JsonTypeNode = { key: "container", typeHash: "" };
  const stack: JsonTypeNode[] = [root];

  for (const event of treeWalkEvents) {
    const currentNode = stack[stack.length - 1];
    switch (event.eventType) {
      case "openObject":
        const objectNode: JsonTypeNode = { key: event.key, typeHash: "", children: [] };
        currentNode.children ??= [];
        currentNode.children!.push(objectNode);
        stack.push(objectNode);
        break;
      case "closeObject":
        // Deduplicate children based on type hash
        currentNode.children = currentNode.children?.filter((child, index, array) => array.findIndex((other) => other.typeHash === child.typeHash) === index);

        // FIXME: empty array vs. object will be ambiguous
        currentNode.typeHash = currentNode.children!.map((child) => `${child.key}:${child.typeHash}`).join(",");
        stack.pop();
        break;
      case "visitLeaf":
        const type = typeof event.value;
        const leafNode: JsonTypeNode = { key: event.key, typeHash: type, type };
        currentNode.children ??= [];
        currentNode.children!.push(leafNode);
        break;
    }
  }

  return root.children![0];
}

// TODO merge the types from bottom up

// console.log(JSON.stringify([...jsonTreeWalk(100)], null, 2));
// console.log(JSON.stringify([...jsonTreeWalk({ a: 1, b: 2 })], null, 2));

// console.log(JSON.stringify(inferJsonType(jsonTreeWalk([{ x: "123" }, { x: "123", y: 123 }, { x: "xx" }])), null, 2));
// const astNode = inferJsonType(jsonTreeWalk([1, { x: "test" }]));

// const emitResult = emitNode(astNode);
// return printEmittedResult(emitResult, rootName);
