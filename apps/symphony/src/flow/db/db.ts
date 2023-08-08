import { Cozo } from "../../cozo/cozo";
import type { GraphOutputItem, GraphTaskData } from "../custom-node/shared/graph";

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

export function setTask(db: Cozo, taskId: string, taskData: GraphTaskData) {
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

export function getTaskByOutputId(db: Cozo, outputId: string) {
  const results = db.query(
    `
?[taskId, taskData] := *tasks[taskId, taskData], *graphOutput[outputId, position, data, taskId, sourceIds], outputId = $outputId

:limit 1
  `,
    { outputId }
  );

  return results.rows
    .map((row) => {
      return row[1] as GraphTaskData;
    })
    .at(0);
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
  nodes: GraphOutputNode[];
  edges: GraphOutputEdge[];
}
export interface GraphOutputNode {
  id: string;
  position: number;
  data: any;
  task: GraphTaskData;
}
export interface GraphOutputEdge {
  source: string;
  target: string;
}

export function getSourceGraphDFS(db: Cozo, id: string): SourceGraph {
  const nodes: GraphOutputNode[] = [];
  const edges: GraphOutputEdge[] = [];

  const exploredIds = new Set<string>();
  const pendingIds: string[] = [id];

  while (pendingIds.length) {
    const currentId = pendingIds.shift()!;
    if (exploredIds.has(currentId)) continue;
    exploredIds.add(currentId);

    const node = getGraphOutput(db, currentId);
    if (!node) continue;

    const task = getTaskByOutputId(db, currentId);
    if (!task) continue;

    nodes.push({ id: node.id, position: node.position, data: node.data, task });
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
