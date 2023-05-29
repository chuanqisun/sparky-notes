import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { ListView, SelectableNode, VerticalToolbar } from "./utils";

export interface ChatProps {
  text: string;
  onTextChange: (text: string) => void;
  list: string[];
  onListChange: (list: string[]) => void;
}
export const ChatNode = memo((props: NodeProps<ChatProps>) => {
  const handleRun = () => {
    props.data.onListChange(["item 1", "item 2", "item 3"]);
  };

  const handleClear = () => {
    props.data.onListChange([]);
  };

  return (
    <SelectableNode selected={props.selected}>
      <VerticalToolbar position={Position.Left} align="start">
        <button onClick={handleRun}>Run</button>
        <button onClick={handleClear}>Clear</button>
      </VerticalToolbar>
      <Handle type="target" position={Position.Top} />
      <h1>Chat</h1>
      <textarea className="nodrag" onChange={(e) => props.data.onTextChange(e.target.value)} value={props.data.text}></textarea>
      <ListView list={props.data.list} />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});
