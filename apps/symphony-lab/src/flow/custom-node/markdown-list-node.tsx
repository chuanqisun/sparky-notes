import { memo, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { responseToList } from "../../openai/format";
import { ListView, SelectableNode } from "./utils";

export interface MarkdownListProps {
  text: string;
  onTextChange: (text: string) => void;
  list: string[];
  onListChange: (list: string[]) => void;
}
export const MarkdownListNode = memo((props: NodeProps<MarkdownListProps>) => {
  useEffect(() => {
    props.data.onListChange(responseToList(props.data.text).listItems);
  }, [props.data.text]);

  return (
    <SelectableNode selected={props.selected}>
      <h1>Markdown list</h1>
      <textarea className="nodrag" value={props.data.text} onChange={(e) => props.data.onTextChange(e.target.value)} />
      <ListView list={props.data.list} />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});
