import { memo, useState } from "react";
import { Handle, NodeToolbar, Position, type NodeProps } from "reactflow";
import { SelectableNode } from "./utils";

export interface ChatProps {
  text: string;
  onTextChange: (text: string) => void;
}
export const ChatNode = memo((props: NodeProps<ChatProps>) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <SelectableNode className={isEditing ? "nodrag" : undefined} selected={props.selected}>
      <NodeToolbar position={Position.Bottom} align="start">
        <button>Run</button>
      </NodeToolbar>
      <Handle type="target" position={Position.Top} />
      <h1>Chat</h1>
      <textarea
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        onChange={(e) => props.data.onTextChange(e.target.value)}
        value={props.data.text}
      ></textarea>
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});
