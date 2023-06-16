import { useEffect, useMemo, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import styled from "styled-components";
import type { Cozo } from "../../../cozo/cozo";
import { getSourceGraphDFS } from "../../db/db";
import type { GraphOutputItem } from "./graph";

export interface TraceExplorer {
  graph: Cozo;
  nodes: GraphOutputItem[];
}

export const TraceExplorer = (props: TraceExplorer) => {
  const [explorerRootId, setExplorerRootId] = useState<string>();

  return (
    <TwoColumns className="nodrag nowheel">
      <ItemList>
        {props.nodes.map((item) => (
          <div key={item.id}>
            <button onClick={() => setExplorerRootId(item.id)}>{item.position}</button>
          </div>
        ))}
      </ItemList>
      {explorerRootId ? <TraceGraph id={explorerRootId} graph={props.graph} /> : "Select an item to explore"}
    </TwoColumns>
  );
};

interface TraceGraphProps {
  graph: Cozo;
  id: string;
}
const TraceGraph = (props: TraceGraphProps) => {
  const sourceGraph = useMemo(() => getSourceGraphDFS(props.graph, props.id), [props.graph, props.id]);

  useEffect(() => {
    console.log(sourceGraph);
  }, [sourceGraph]);

  return (
    <ForceGraph2D
      height={320}
      width={280}
      graphData={{
        nodes: sourceGraph.nodes,
        links: sourceGraph.edges,
      }}
      linkDirectionalArrowLength={8}
      nodeLabel={(node) => JSON.stringify(node.data)}
      nodeAutoColorBy={(node) => node.task.name}
    />
  );
};

const ItemList = styled.div`
  overflow-y: scroll;
`;

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: 40px 280px;
  grid-template-rows: 320px;
`;
