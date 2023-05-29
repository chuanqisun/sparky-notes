import { memo, useState } from "react";
import { Handle, NodeToolbar, Position, type NodeProps } from "reactflow";
import styled from "styled-components";

export interface ListNodeProps {
  text: string;
}
export const ChatNode = memo(({ data, selected }: NodeProps<ListNodeProps>) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <StyledNode className={isEditing ? "nodrag" : undefined} isSelected={selected}>
      <NodeToolbar position={Position.Bottom} align="start">
        <button>Run</button>
      </NodeToolbar>
      <Handle type="target" position={Position.Top} />
      <h1>Chat</h1>
      <textarea onFocus={() => setIsEditing(true)} onBlur={() => setIsEditing(false)}>
        {data.text}
      </textarea>
      <Handle type="source" position={Position.Bottom} />
    </StyledNode>
  );
});

const StyledNode = styled.div<{ isSelected: boolean }>`
  background-color: #fff;
  padding: 8px;
  border: 1px solid ${(props) => (props.isSelected ? "#00aaff" : "#ddd")};
`;
