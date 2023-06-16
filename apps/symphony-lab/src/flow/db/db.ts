import { Cozo } from "../../cozo/cozo";
import type { GraphOutputItem } from "../custom-node/shared/graph";

export const SCHEMA = `
:create graphOutput {
  id: String
  =>
  position: Int,
  data: Json,
  taskId: String,
  sourceIds: [String]
}
`;

export async function setGraphOutput(db: Cozo, taskId: string, outputItem: GraphOutputItem) {
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
  edges: { source: string; target: string }[];
}
export function getSourceGraph(db: Cozo, id: string): SourceGraph {
  const results = db.query(
    `
edge[parentId, childId] := *graphOutput[parentId, parentPos, parentData, parentTask, parentSources], *graphOutput[childId, childPos, childData, childTask, childSources], is_in(parentId, childSources)
chain[parentId, childId] := edge[parentId, childId], childId = $id
chain[parentId, childId] := edge[parentId, childId], chain[childId, grandChildId], 

?[parentId, childId] := chain[parentId, childId]
  `,
    {
      id,
    }
  );

  return {
    nodes: results.rows as any[],
    edges: [],
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
