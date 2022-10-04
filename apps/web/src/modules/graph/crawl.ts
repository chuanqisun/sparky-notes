import type { EdgeSchema, NodeSchema } from "./db";

export interface CrawledTree {
  node: NodeSchema;
  from: CrawledTreeChild[];
  to: CrawledTreeChild[];
}
export interface CrawledTreeChild {
  edge: EdgeSchema;
  tree: CrawledTree;
}

export interface CrawlTreeConfig {
  maxDepth: number;
  getNodes: (ids: string[]) => Promise<NodeSchema[]>;
  getEdges: (nodeIds: string[]) => Promise<{ inEdges: EdgeSchema[]; outEdges: EdgeSchema[] }>;
}

export async function crawlTree(config: CrawlTreeConfig, id: string, depth = 0): Promise<CrawledTree> {
  const node = (await config.getNodes([id]))?.[0];
  if (!node) throw new Error("Node not found");

  if (depth >= config.maxDepth) {
    return {
      node,
      from: [],
      to: [],
    };
  }

  const { inEdges, outEdges } = await config.getEdges([node.id]);
  const fromTrees = Promise.all(
    inEdges.map(async (edge) => ({
      edge,
      tree: await crawlTree(config, edge.from, depth + 1),
    }))
  );
  const toTrees = Promise.all(
    outEdges.map(async (edge) => ({
      edge,
      tree: await crawlTree(config, edge.to, depth + 1),
    }))
  );

  return {
    node,
    from: await fromTrees,
    to: await toTrees,
  };
}

export interface CrawledGraph {
  nodes: CrawledGraphNodes[];
  edges: EdgeSchema[];
}

export interface CrawledGraphNodes extends NodeSchema {
  distance: number;
}

export interface CrawlGraphConfig {
  maxDistance: number;
  getEdges: (nodeIds: string[]) => Promise<{ inEdges: EdgeSchema[]; outEdges: EdgeSchema[] }>;
  getNodes: (ids: string[]) => Promise<NodeSchema[]>;
}

export async function crawlGraph(config: CrawlGraphConfig, boundaryNodeIds: string[], graph: CrawledGraph, distance: number): Promise<CrawledGraph> {
  const boundaryNodes = await config.getNodes(boundaryNodeIds);
  const crawledBoundaryNodes = boundaryNodes.map((node) => ({ ...node, distance }));
  const { newItems: newNodes, allItems: allNodes } = mergeById(graph.nodes, crawledBoundaryNodes);

  if (config.maxDistance === distance)
    return {
      nodes: allNodes,
      edges: graph.edges,
    };

  const { inEdges, outEdges } = await config.getEdges(newNodes.map((node) => node.id));
  const { allItems: allEdges } = mergeById(graph.edges, [...inEdges, ...outEdges]);

  const adjacentNodeIds = getNodeIds(inEdges, outEdges);

  return crawlGraph(config, adjacentNodeIds, { nodes: allNodes, edges: allEdges }, distance + 1);
}

function mergeById<T extends { id?: any }>(existingItems: T[], incomingItems: T[]) {
  const newItems = incomingItems
    .filter((item, i, arr) => arr.findIndex((existing) => existing.id === item.id) === i)
    .filter((item) => existingItems.every((existingItem) => existingItem.id !== item.id));

  return {
    allItems: [...existingItems, ...newItems],
    newItems,
  };
}

function getNodeIds(inEdges: EdgeSchema[], outEdges: EdgeSchema[]): string[] {
  return [...inEdges.map((edge) => edge.from), ...outEdges.map((edge) => edge.to)];
}
