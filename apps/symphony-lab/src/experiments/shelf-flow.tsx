import type React from "react";
import { useCallback, useEffect } from "react";
import ReactFlow, { Background, Controls, Panel, addEdge, useEdgesState, useNodesState, type Edge, type Node, type OnConnect } from "reactflow";

import "reactflow/dist/style.css";
import { useModelSelector } from "../account/model-selector";
import { ChatNode } from "../flow/custom-node/chat-node";
import { FileNode } from "../flow/custom-node/file-node";
import { MarkdownListNode } from "../flow/custom-node/markdown-list-node";

const nodeTypes = { markdownList: MarkdownListNode, chat: ChatNode, file: FileNode };

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const ShelfFlow: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { chat, ModelSelectorElement } = useModelSelector();

  const onConnect = useCallback<OnConnect>((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const handleListChange = useCallback(
    (id: string, list: string[]) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, list } } : n))),
    [setNodes]
  );

  const handleGetInputList = useCallback(
    (id: string) => {
      const source = edges.find((e) => e.target === id)?.source;
      return nodes.find((n) => n.id === source)?.data.list ?? [];
    },
    [nodes, edges]
  );

  useEffect(
    () =>
      setNodes((ns) =>
        ns.map((node) => ({
          ...node,
          data: {
            ...node.data,
            getInputList: () => handleGetInputList(node.id),
            chat,
            onListChange: (list: string[]) => handleListChange(node.id, list),
          },
        }))
      ),
    [handleGetInputList, chat, handleListChange, setNodes]
  );

  const onAddMarkdownListNode = () => {
    const id = `${nodes.length + 1}`;
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: "markdownList",
        position: { x: 100, y: 100 },
        data: {
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
        position: { x: 100, y: 100 },
        data: {
          chat,
          list: [],
          onListChange: (list: string[]) => handleListChange(id, list),
          getInputList: () => handleGetInputList(id),
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
        position: { x: 100, y: 100 },
        data: { text: "(empty)", list: [] },
      },
    ]);
  };

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
      <Panel position="top-right">{ModelSelectorElement}</Panel>
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default ShelfFlow;
