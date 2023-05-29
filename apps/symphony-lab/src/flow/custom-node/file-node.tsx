import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { SelectableNode } from "./utils";

export interface ChatProps {
  text: string;
  onTextChange: (text: string) => void;
}
export const FileNode = memo((props: NodeProps<ChatProps>) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <SelectableNode className={isEditing ? "nodrag" : undefined} selected={props.selected}>
      <h1>File</h1>
      <button>Upload</button>
      <br />
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
