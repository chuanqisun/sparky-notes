import { useState } from "react";
import styled from "styled-components";
import type { Cozo } from "../../../cozo/cozo";
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
      <TraceGraph id={explorerRootId} graph={props.graph} />
    </TwoColumns>
  );
};

interface TraceGraphProps {
  graph: Cozo;
  id?: string;
}
const TraceGraph = (props: TraceGraphProps) => {
  return <div>Magic happens here {props.id}!</div>;
};

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
`;
