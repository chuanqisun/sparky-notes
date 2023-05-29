import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { ListView, SelectableNode } from "./utils";

export interface ChatProps {
  text: string;
  onTextChange: (text: string) => void;
  list: string[];
}
export const FileNode = memo((props: NodeProps<ChatProps>) => {
  return (
    <SelectableNode selected={props.selected}>
      <h1>File</h1>
      <button>Upload</button>
      <Handle type="source" position={Position.Bottom} />
      <ListView list={props.data.list} />
    </SelectableNode>
  );
});
