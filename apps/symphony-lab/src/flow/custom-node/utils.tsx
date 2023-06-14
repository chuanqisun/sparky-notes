import { memo } from "react";
import { NodeToolbar } from "reactflow";
import styled from "styled-components";

export const SelectableNode = styled.div<{ selected: boolean }>`
  background-color: #fff;
  padding: 8px;
  border: 1px solid ${(props) => (props.selected ? "#00aaff" : "#ddd")};
`;

export const VerticalToolbar = styled(NodeToolbar)`
  display: grid;
`;

export const HorizontalToolbar = styled(NodeToolbar)`
  display: grid;
  grid-auto-flow: column;
`;

export interface ListViewProps {
  list: string[];
}
export const ListView = memo((props: ListViewProps) => (
  <details className="nodrag">
    <summary>Output ({props.list.length})</summary>
    <div>
      {props.list.map((item, index) => (
        <div key={index}>{item}</div>
      ))}
    </div>
  </details>
));
