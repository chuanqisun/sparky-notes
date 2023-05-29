import type React from "react";
import { useCallback } from "react";
import ReactFlow, { Background, Controls, Panel, addEdge, useEdgesState, useNodesState, type Edge, type Node, type OnConnect } from "reactflow";

import "reactflow/dist/style.css";
import { ChatNode } from "../flow/custom-node/chat-node";
import { FileNode } from "../flow/custom-node/file-node";
import { MarkdownListNode } from "../flow/custom-node/markdown-list-node";

const nodeTypes = { markdownList: MarkdownListNode, chat: ChatNode, file: FileNode };

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const ShelfFlow: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback<OnConnect>((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onAddMarkdownListNode = () => {
    const id = `${nodes.length + 1}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "markdownList",
        position: { x: 0, y: 0 },
        data: {
          text: "- Item 1\n- Item 2",
          onTextChange: (text: string) => handleTextChange(id, text),
          list: [],
          onListChange: (list: string[]) => handleListChange(id, list),
        },
      },
    ]);
  };

  const onAddChatNode = () => {
    const id = `${nodes.length + 1}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "chat",
        position: { x: 0, y: 0 },
        data: {
          text: "What do you think of {{input}}?",
          onTextChange: (text: string) => handleTextChange(id, text),
          list: [],
          onListChange: (list: string[]) => handleListChange(id, list),
        },
      },
    ]);
  };

  const onAddFileNode = () => {
    const id = `${nodes.length + 1}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "file",
        position: { x: 0, y: 0 },
        data: { text: "(empty)", onTextChange: (text: string) => handleTextChange(id, text) },
      },
    ]);
  };

  const handleTextChange = useCallback(
    (id: string, text: string) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, text } } : n))),
    []
  );

  const handleListChange = useCallback(
    (id: string, list: string[]) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, list } } : n))),
    []
  );

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      proOptions={{ hideAttribution: true }}
    >
      <Panel position="top-left">
        <button onClick={onAddMarkdownListNode}>Add markdown list</button>
        <button onClick={onAddChatNode}>Add chat</button>
        <button onClick={onAddFileNode}>Add file</button>
      </Panel>
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default ShelfFlow;
