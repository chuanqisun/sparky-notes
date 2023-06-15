import styled from "styled-components";

export const SelectableNode = styled.div<{ selected: boolean }>`
  background-color: #fff;
  width: 320px;
  border-radius: 4px;
  overflow: hidden;
  --drag-bar-background: ${(props) => (props.selected ? "#0077ff" : "#ddd")};
  --drag-bar-color: ${(props) => (props.selected ? "#fff" : "#000")};
`;
