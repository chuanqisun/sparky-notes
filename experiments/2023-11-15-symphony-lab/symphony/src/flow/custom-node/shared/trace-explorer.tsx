import { useCallback, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import styled from "styled-components";
import type { Cozo } from "../../../cozo/cozo";
import { getSourceGraphDFS } from "../../db/db";
import type { GraphOutputItem } from "./graph";

export interface TraceExplorer {
  onSelect: (id: string) => void;
  nodes: GraphOutputItem[];
}

export const TraceExplorer = (props: TraceExplorer) => {
  return (
    <ItemList>
      {props.nodes.map((item) => (
        <div key={item.id}>
          <button onClick={() => props.onSelect(item.id)}>{item.position}</button>
        </div>
      ))}
    </ItemList>
  );
};

export const TraceGraphContainer = styled.div`
  background-color: black;
`;

export interface TraceGraphProps {
  graph: Cozo;
  lens: Record<string, (data: any) => string>;
  id: string;
  width: number;
  height: number;
}
export const TraceGraph = (props: TraceGraphProps) => {
  const sourceGraph = useMemo(() => getSourceGraphDFS(props.graph, props.id), [props.graph, props.id]);

  const dataToString = useCallback(
    ({ task, data }: { task: any; data: any }) => {
      return props.lens[task?.name ?? ""]?.(data) ?? (typeof data === "string" ? data : JSON.stringify(data));
    },
    [props.lens]
  );

  useEffect(() => {
    console.log(sourceGraph);
  }, [sourceGraph]);

  return (
    <ForceGraph2D
      height={props.height}
      width={props.width}
      graphData={{
        nodes: sourceGraph.nodes,
        links: sourceGraph.edges,
      }}
      linkColor={() => "#555"}
      linkDirectionalArrowLength={8}
      nodeLabel={dataToString}
      nodeAutoColorBy={(node) => node.task.name}
    />
  );
};

const ItemList = styled.div`
  display: flex;
  flex-wrap: wrap;
`;
