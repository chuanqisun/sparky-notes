import type React from "react";
import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Panel,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "reactflow";

import "reactflow/dist/style.css";
import { useModelSelector } from "../account/model-selector";
import { ChatNode } from "../flow/custom-node/chat-node";
import { CustomPipeNode, CustomSinkNode, CustomSourceNode } from "../flow/custom-node/custom-node";
import { FileNode } from "../flow/custom-node/file-node";
import { MarkdownListNode } from "../flow/custom-node/markdown-list-node";

const nodeTypes = {
  basicList: CustomSourceNode,
  basicPipe: CustomPipeNode,
  basicSink: CustomSinkNode,
  markdownList: MarkdownListNode,
  chat: ChatNode,
  file: FileNode,
};

export interface GraphModel {
  nodes: Node[];
  edges: Edge[];
}

export const ShelfFlow: React.FC = () => {
  const [model, setModel] = useState<GraphModel>({ nodes: [], edges: [] });

  // reducers
  const setNodes = useCallback((updateFn: (prevNodes: Node[]) => Node[]) => setModel((m) => ({ ...m, nodes: updateFn(m.nodes) })), []);
  const setEdges = useCallback((updateFn: (prevEdges: Edge[]) => Edge[]) => setModel((m) => ({ ...m, edges: updateFn(m.edges) })), []);
  const onNodesChange = useCallback<OnNodesChange>((changes) => setNodes((nodes) => applyNodeChanges(changes, nodes)), [setNodes]);
  const onEdgesChange = useCallback<OnEdgesChange>((changes) => setEdges((edges) => applyEdgeChanges(changes, edges)), [setEdges]);
  const onConnect = useCallback<OnConnect>((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = useCallback((node: Node) => setNodes((ns) => [...ns, node]), [setNodes]);

  const addNodeByType = useCallback(
    (type: keyof typeof nodeTypes) => {
      const id = crypto.randomUUID();
      addNode({
        id,
        type,
        position: { x: 100, y: 100 },
        data: {
          model: {},
          setModel: (nodeModel: any) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, model: nodeModel } } : n))),
        },
      });
    },
    [addNode]
  );

  // views
  const nodes = model.nodes;
  const edges = model.edges;

  useEffect(() => console.log("[DEBUG] nodes", nodes), [nodes]);

  const { chat, ModelSelectorElement } = useModelSelector();

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

  // useEffect(
  //   () =>
  //     setNodes((ns) =>
  //       ns.map((node) => ({
  //         ...node,
  //         data: {
  //           ...node.data,
  //           getInputList: () => handleGetInputList(node.id),
  //           chat,
  //           onListChange: (list: string[]) => handleListChange(node.id, list),
  //         },
  //       }))
  //     ),
  //   [handleGetInputList, chat, handleListChange, setNodes]
  // );

  // const onAddMarkdownListNode = () => {
  //   const id = `${nodes.length + 1}`;
  //   setNodes((ns) => [
  //     ...ns,
  //     {
  //       id,
  //       type: "markdownList",
  //       position: { x: 100, y: 100 },
  //       data: {
  //         list: [],
  //         onListChange: (list: string[]) => handleListChange(id, list),
  //       },
  //     },
  //   ]);
  // };

  // const onAddChatNode = () => {
  //   const id = `${nodes.length + 1}`;
  //   setNodes((ns) => [
  //     ...ns,
  //     {
  //       id,
  //       type: "chat",
  //       position: { x: 100, y: 100 },
  //       data: {
  //         chat,
  //         list: [],
  //         onListChange: (list: string[]) => handleListChange(id, list),
  //         getInputList: () => handleGetInputList(id),
  //       },
  //     },
  //   ]);
  // };

  // const onAddFileNode = () => {
  //   const id = `${nodes.length + 1}`;
  //   setNodes((ns) => [
  //     ...ns,
  //     {
  //       id,
  //       type: "file",
  //       position: { x: 100, y: 100 },
  //       data: { text: "(empty)", list: [] },
  //     },
  //   ]);
  // };

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
        <button onClick={() => addNodeByType("basicList")}>Add basic list</button>
        <button onClick={() => addNodeByType("basicPipe")}>Add pipe</button>
        <button onClick={() => addNodeByType("basicSink")}>Add sink</button>
        {/* <button onClick={onAddMarkdownListNode}>Add markdown list</button>
        <button onClick={onAddChatNode}>Add chat</button>
        <button onClick={onAddFileNode}>Add file</button> */}
      </Panel>
      <Panel position="top-right">{ModelSelectorElement}</Panel>
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default ShelfFlow;
