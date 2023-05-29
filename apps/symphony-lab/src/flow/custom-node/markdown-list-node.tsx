import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { SelectableNode } from "./utils";

export interface MarkdownListProps {
  text: string;
  onTextChange: (text: string) => void;
}
export const MarkdownListNode = memo((props: NodeProps<MarkdownListProps>) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <SelectableNode className={isEditing ? "nodrag" : undefined} selected={props.selected}>
      <h1>Markdown list</h1>
      <textarea
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        value={props.data.text}
        onChange={(e) => props.data.onTextChange(e.target.value)}
      />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});
