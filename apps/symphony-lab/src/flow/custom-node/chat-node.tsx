import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ChatMessage, OpenAIChatPayload } from "../../openai/chat";
import { ListView, SelectableNode, VerticalToolbar } from "./utils";

export interface ChatProps {
  chat: (messages: ChatMessage[], config?: Partial<OpenAIChatPayload>) => Promise<string>;
  list: string[];
  onListChange: (list: string[]) => void;
  getInputList: () => string[]; // POC
}
export const ChatNode = memo((props: NodeProps<ChatProps>) => {
  const [text, setText] = useState("");

  const handleRun = async () => {
    props.data.onListChange([]);
    const inputItems = props.data.getInputList();
    const results = await Promise.all(inputItems.map((item) => props.data.chat([{ role: "user", content: item }])));
    props.data.onListChange(results);
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
      <textarea className="nodrag" onChange={(e) => setText(e.target.value)} value={text}></textarea>
      <ListView list={props.data.list} />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});
