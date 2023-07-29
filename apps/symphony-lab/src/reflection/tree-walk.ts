export type JsonTreePath = (string | number)[];
export type JsonLeafNode = { value: any; path: JsonTreePath };

export interface TreeWalkEvent {
  type: "openObject" | "closeObject" | "visitLeaf";
  key: string | number; // top level is always "root"
  value?: any; // only on visit
}

export function* jsonTreeWalk(root: any, key: string | number = "root"): Generator<TreeWalkEvent> {
  const type = typeof root;
  switch (type) {
    case "object":
      if (root === null) {
        yield { type: "visitLeaf", key, value: null };
      } else if (Array.isArray(root)) {
        yield { type: "openObject", key };
        for (let i = 0; i < root.length; i++) {
          yield* jsonTreeWalk(root[i], i);
        }
        yield { type: "closeObject", key };
      } else {
        yield { type: "openObject", key };
        for (const [key, value] of Object.entries(root)) {
          yield* jsonTreeWalk(value, key);
        }
        yield { type: "closeObject", key };
      }
      break;
    default:
      yield { type: "visitLeaf", key, value: root };
  }
}

export interface TreeWalkNode {
  path: (string | number)[];
  value?: any; // only on leaf node
}

export function* jsonTreeWalkPath(root: any, path: (string | number)[] = []): Generator<TreeWalkNode> {
  if (Array.isArray(root)) {
    for (let i = 0; i < root.length; i++) {
      yield* jsonTreeWalkPath(root[i], [...path, i]);
    }
  } else if (typeof root === "object") {
    for (const key of Object.keys(root)) {
      yield* jsonTreeWalkPath(root[key], [...path, key]);
    }
  }
  yield { path, value: root };
}

export function postOrderSort(nodes: TreeWalkNode[]) {
  return nodes
    .map((n) => ({ ...n, path: n.path.map((p) => (typeof p === "number" ? 0 : p)) }))
    .sort((a, b) => {
      // FIXME, json key might include comma
      const aPath = a.path.join(",");
      const bPath = b.path.join(",");
      return bPath.localeCompare(aPath);
    });
}
