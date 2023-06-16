import { Cozo } from "../../cozo/cozo";
import type { GraphOutputItem } from "../custom-node/shared/graph";

export const SCHEMA = `
{
  :create graphOutput {
    id: String
    =>
    position: Int,
    data: Json,
    taskId: String,
    sourceIds: [String]
  }
}
  {
  :create tasks {
    id: String
    =>
    data: Json
  }
}
`;

export function setTask(db: Cozo, taskId: string, taskData: any) {
  return db.mutate(
    `
?[id, data] <- [[
  $id,
  json($data),
]]

:put tasks {
  id
  =>
  data,
}
    `,
    {
      id: taskId,
      data: taskData,
    }
  );
}

export function setGraphOutput(db: Cozo, taskId: string, outputItem: GraphOutputItem) {
  return db.mutate(
    `
?[id, position, data, taskId, sourceIds] <- [[
  $id,
  $position,
  json($data),
  $taskId,
  $sourceIds,
]]

:put graphOutput {
  id
  =>
  position,
  data,
  taskId,
  sourceIds,
}
`,
    {
      id: outputItem.id,
      position: outputItem.position,
      data: outputItem.data,
      taskId: taskId,
      sourceIds: outputItem.sourceIds,
    }
  );
}

export function getGraphOutput(db: Cozo, id: string): GraphOutputItem | undefined {
  const results = db.query(
    `
?[id, position, data, taskId, sourceIds] := *graphOutput{id, position, data, taskId, sourceIds}, id = $id
`,
    {
      id,
    }
  );

  return results.rows
    .map((row) => {
      return {
        id: row[0] as string,
        position: row[1] as number,
        data: row[2] as any,
        taskId: row[3] as string,
        sourceIds: row[4] as string[],
      };
    })
    .at(0);
}

export interface SourceGraph {
  nodes: GraphOutputItem[];
  edges: GraphOutputEdge[];
}
export interface GraphOutputEdge {
  source: string;
  target: string;
}
export function getSourceGraph(db: Cozo, id: string): SourceGraph {
  const nodeResults = db.query(
    `
edge[parentId, childId] := *graphOutput[parentId, parentPos, parentData, parentTask, parentSources], *graphOutput[childId, childPos, childData, childTask, childSources], is_in(parentId, childSources)
chain[parentId, childId] := edge[parentId, childId], childId = $id
chain[parentId, childId] := edge[parentId, childId], chain[childId, grandChildId] 
reached[id] := chain[id, any] or chain[any, id]

?[id, position, data, taskId, sourceIds] := *graphOutput[id, position, data, taskId, sourceIds], reached[id]
  `,
    {
      id,
    }
  );

  const nodes = nodeResults.rows.map((row) => {
    return {
      id: row[0] as string,
      position: row[1] as number,
      data: row[2] as any,
      taskId: row[3] as string,
      sourceIds: row[4] as string[],
    };
  });

  const edgeResults = db.query(
    `
edge[parentId, childId] := *graphOutput[parentId, parentPos, parentData, parentTask, parentSources], *graphOutput[childId, childPos, childData, childTask, childSources], is_in(parentId, childSources)
chain[parentId, childId] := edge[parentId, childId], childId = $id
chain[parentId, childId] := edge[parentId, childId], chain[childId, grandChildId] 

?[parentId, childId] := chain[parentId, childId]
  `,
    {
      id,
    }
  );

  const edges = edgeResults.rows.map((row) => ({
    source: row[0] as string,
    target: row[1] as string,
  }));

  return {
    nodes,
    edges,
  };
}

export function getSourceGraphDFS(db: Cozo, id: string): SourceGraph {
  const nodes: GraphOutputItem[] = [];
  const edges: GraphOutputEdge[] = [];

  const exploredIds = new Set<string>();
  const pendingIds: string[] = [id];

  while (pendingIds.length) {
    const currentId = pendingIds.shift()!;
    if (exploredIds.has(currentId)) continue;
    exploredIds.add(currentId);

    const node = getGraphOutput(db, currentId);
    if (!node) continue;
    nodes.push(node);
    edges.push(...node.sourceIds.map((sourceId) => ({ source: sourceId, target: currentId })));

    pendingIds.push(...node.sourceIds);
  }

  return {
    nodes,
    edges,
  };
}

export function getGraphOutputs(db: Cozo, taskId?: string): GraphOutputItem[] {
  if (!taskId) return [];

  const results = db.query(
    `
?[id, position, data, taskId, sourceIds] := *graphOutput{id, position, data, taskId, sourceIds}, taskId = $taskId
`,
    {
      taskId,
    }
  );

  return results.rows
    .map((row) => {
      return {
        id: row[0] as string,
        position: row[1] as number,
        data: row[2] as any,
        taskId: row[3] as string,
        sourceIds: row[4] as string[],
      };
    })
    .sort((a, b) => a.position - b.position);
}
