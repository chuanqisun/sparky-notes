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
