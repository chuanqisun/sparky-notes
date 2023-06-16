import { useEffect, useMemo, useState } from "react";
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
      <div>
        {props.nodes.map((item) => (
          <div key={item.id}>
            <button onClick={() => setExplorerRootId(item.id)}>Item {item.position}</button>
          </div>
        ))}
      </div>
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

  return <div>Magic happens here {props.id}!</div>;
};

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
`;
