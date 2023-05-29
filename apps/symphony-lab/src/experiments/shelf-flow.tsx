import type React from "react";
import { useCallback } from "react";
import ReactFlow, { Background, Controls, Panel, addEdge, useEdgesState, useNodesState, type Edge, type Node, type OnConnect } from "reactflow";

import "reactflow/dist/style.css";
import { ChatNode } from "../flow/custom-node/chat-node";
import { MarkdownListNode } from "../flow/custom-node/markdown-list-node";

const nodeTypes = { markdownList: MarkdownListNode, chat: ChatNode };

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const ShelfFlow: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback<OnConnect>((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onAddMarkdownListNode = () => {
    const id = `${nodes.length + 1}`;
    setNodes((ns) => [...ns, { id, type: "markdownList", position: { x: 0, y: 0 }, data: "- Item 1\n- Item 2" }]);
  };

  const onAddChatNode = () => {
    const id = `${nodes.length + 1}`;
    setNodes((ns) => [...ns, { id, type: "chat", position: { x: 0, y: 0 }, data: { text: "What do you think of {{input}}?" } }]);
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
      </Panel>
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default ShelfFlow;
