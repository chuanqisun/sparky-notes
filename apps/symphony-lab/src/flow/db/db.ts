import { Cozo } from "../../cozo/cozo";
import type { GraphOutputItem } from "../custom-node/custom-node";

export const SCHEMA = `
:create graphOutput {
  id: String
  =>
  data: Json,
  nodeId: String,
  sourceIds: [String]
}
`;

export async function setGraphOutput(db: Cozo, nodeId: string, outputItem: GraphOutputItem) {
  return db.mutate(
    `
?[id, data, nodeId, sourceIds] <- [[
  $id,
  json($data),
  $nodeId,
  $sourceIds,
]]

:put graphOutput {
  id
  =>
  data,
  nodeId,
  sourceIds,
}
`,
    {
      id: outputItem.id,
      data: outputItem.data,
      nodeId,
      sourceIds: outputItem.sourceIds,
    }
  );
}

export async function getGraphOutputs(db: Cozo, nodeId: string): Promise<GraphOutputItem[]> {
  const results = await db.query(
    `
?[id, data, nodeId, sourceIds] := *graphOutput{id, data, nodeId, sourceIds}, nodeId = $nodeId
`,
    {
      nodeId,
    }
  );

  return results.rows.map((row) => {
    return {
      id: row[0] as string,
      data: row[1] as any,
      nodeId: row[2] as string,
      sourceIds: row[3] as string[],
    };
  });
}
