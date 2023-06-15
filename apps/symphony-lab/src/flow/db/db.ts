import { Cozo } from "../../cozo/cozo";
import type { GraphOutputItem } from "../custom-node/custom-node";

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
