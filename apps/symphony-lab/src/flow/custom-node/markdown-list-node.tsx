import { memo, useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { responseToList } from "../../openai/format";
import { ListView, SelectableNode } from "./utils";

export interface MarkdownListProps {
  list: string[];
  onListChange: (list: string[]) => void;
}
export const MarkdownListNode = memo((props: NodeProps<MarkdownListProps>) => {
  const [text, setText] = useState("");

  useEffect(() => {
    props.data.onListChange(responseToList(text).listItems);
  }, [text]);

  return (
    <SelectableNode selected={props.selected}>
      <h1>Markdown list</h1>
      <textarea className="nodrag" value={text} onChange={(e) => setText(e.target.value)} />
      <ListView list={props.data.list} />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});
