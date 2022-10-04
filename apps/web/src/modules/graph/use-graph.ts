import type { IDBPObjectStore } from "idb";
import { useCallback, useRef, useState } from "preact/hooks";
import { CrawledGraph, crawlGraph, crawlTree } from "./crawl";
import { EdgeSchema, getGraphDB, GraphDBSchema, NodeSchema } from "./db";
import { tx } from "./tx";

export interface GraphNode<T> {
  self: T;
  fromNodes: {
    rel: any;
    node: T;
  }[];
  toNodes: {
    rel: any;
    node: T;
  }[];
}

export function useGraph() {
  const [rev, setRev] = useState(0);

  const graphAsync = useRef(getGraphDB());

  const dump = useCallback(
    async () =>
      tx(await graphAsync.current, ["node", "edge"], "readonly", async (tx) => {
        const nodes = await tx.objectStore("node").getAll();
        const edges = await tx.objectStore("edge").getAll();
        return {
          nodes,
          edges,
        };
      }),
    [rev]
  );

  const put = useCallback(async (nodes: NodeSchema[], edges: EdgeSchema[] = []) => {
    const result = await tx(await graphAsync.current, ["node", "edge"], "readwrite", async (tx) => {
      const nodeStore = tx.objectStore("node");
      const edgeStore = tx.objectStore("edge");
      nodes.map((node) => nodeStore.put(node));
      edges.map((edge) => edgeStore.put(edge));
    });

    setRev((prev) => prev + 1);
    return result;
  }, []);

  const get = useCallback(
    async (ids: string[]) =>
      tx(await graphAsync.current, ["node"], "readonly", async (tx) => {
        const nodeStore = tx.objectStore("node");
        const nodes = await Promise.all(ids.map((id) => nodeStore.get(id)));
        return nodes;
      }),
    [rev]
  );

  const crawlEdges = useCallback(async function (
    edgeStore: IDBPObjectStore<GraphDBSchema, any[], "edge", "readonly">,
    boundaryNodeIds: string[],
    depth: number,
    result: {
      visitedNodeIds: string[];
      visitedEdges: EdgeSchema[];
    }
  ): Promise<EdgeSchema[]> {
    if (depth === 0) return result.visitedEdges;

    const toEdges = (await Promise.all(boundaryNodeIds.map((id) => edgeStore.index("byFrom").getAll(id)))).flat();
    const toIds = await Promise.all(toEdges.flat().map((edge) => edge.to));

    const fromEdges = (await Promise.all(boundaryNodeIds.map((id) => edgeStore.index("byTo").getAll(id)))).flat();
    const fromIds = await Promise.all(fromEdges.flat().map((edge) => edge.from));

    const newBoundaryIds = [...toIds, ...fromIds];

    result.visitedEdges = [...result.visitedEdges, ...toEdges, ...fromEdges];
    result.visitedNodeIds = [...result.visitedNodeIds, ...boundaryNodeIds];

    return crawlEdges(edgeStore, newBoundaryIds, depth - 1, result);
  }, []);

  const getGraphV2 = useCallback(
    async (ids: string[], depth = 1) =>
      tx(await graphAsync.current, ["node", "edge"], "readonly", async (tx) => {
        const nodeStore = tx.objectStore("node");
        const edgeStore = tx.objectStore("edge");

        const result: CrawledGraph = {
          nodes: [],
          edges: [],
        };

        const crawlResult = await crawlGraph(
          {
            maxDistance: depth,
            getEdges: async (nodeIds: string[]) => {
              const inEdges = (await Promise.all(nodeIds.map((id) => edgeStore.index("byTo").getAll(id)))).flat();
              const outEdges = (await Promise.all(nodeIds.map((id) => edgeStore.index("byFrom").getAll(id)))).flat();
              return { inEdges, outEdges };
            },
            getNodes: (ids) => Promise.all(ids.map((id) => nodeStore.get(id) as Promise<NodeSchema>)),
          },
          ids,
          result,
          0
        );

        return crawlResult;
      }),
    []
  );

  const getTree = useCallback(
    async (id: string, depth = 1) =>
      tx(await graphAsync.current, ["node", "edge"], "readonly", async (tx) => {
        const nodeStore = tx.objectStore("node");
        const edgeStore = tx.objectStore("edge");

        const crawlResult = await crawlTree(
          {
            maxDepth: depth,
            getEdges: async (nodeIds: string[]) => {
              const inEdges = (await Promise.all(nodeIds.map((id) => edgeStore.index("byTo").getAll(id)))).flat();
              const outEdges = (await Promise.all(nodeIds.map((id) => edgeStore.index("byFrom").getAll(id)))).flat();
              return { inEdges, outEdges };
            },
            getNodes: (ids) => Promise.all(ids.map((id) => nodeStore.get(id) as Promise<NodeSchema>)),
          },
          id
        );

        return crawlResult;
      }),
    []
  );

  const getGraph = useCallback(
    async (ids: string[], fromDepth = 1, toDepth = 1) =>
      tx(await graphAsync.current, ["node", "edge"], "readonly", async (tx) => {
        const nodeStore = tx.objectStore("node");
        const edgeStore = tx.objectStore("edge");

        const nodes = await Promise.all(
          ids.map(async (id) => {
            const self = await nodeStore.get(id);
            if (!self) return null;

            const incomingEdges = await edgeStore.index("byTo").getAll(self!.id);
            const fromNodes = (
              await Promise.all(
                incomingEdges.map(async (edge) => ({
                  rel: edge.rel,
                  node: (await nodeStore.get(edge.from))!, // checking by filter below
                }))
              )
            ).filter((fromItem) => !!fromItem.node);

            const outgoingEdges = await edgeStore.index("byFrom").getAll(self!.id);
            const toNodes = (
              await Promise.all(
                outgoingEdges.map(async (edge) => ({
                  rel: edge.rel,
                  node: (await nodeStore.get(edge.to))!, // asserting by filter below
                }))
              )
            ).filter((toItem) => !!toItem.node);

            const result: GraphNode<NodeSchema> = {
              self,
              fromNodes,
              toNodes,
            };

            return result;
          })
        );

        return nodes;
      }),
    []
  );

  const clearAll = useCallback(async () => {
    (await graphAsync.current).clear("node");
    (await graphAsync.current).clear("edge");
  }, []);

  const clearEdges = useCallback(async () => {
    (await graphAsync.current).clear("edge");
  }, []);

  return {
    dump,
    clearAll,
    clearEdges,
    get,
    getTree,
    getGraphV2,
    put,
    rev,
  };
}
