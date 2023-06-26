import { useEffect, useMemo, useState } from "react";
import { getGraphOutputs } from "../../db/db";
import type { GraphOutputItem, NodeData } from "./graph";

export function useOutputList(nodeData: NodeData) {
  const [outputList, setOutputList] = useState<GraphOutputItem[]>([]);
  const currentTaskId = useMemo(() => nodeData.taskIds.at(-1), [nodeData.taskIds]);
  useEffect(() => {
    if (currentTaskId) {
      const outputs = getGraphOutputs(nodeData.context.graph, currentTaskId);
      setOutputList(outputs);
    } else {
      setOutputList([]);
    }
  }, [currentTaskId]);

  const outputDataList = useMemo(() => outputList.map((output) => output.data), [outputList]);

  return { outputList, outputDataList };
}
