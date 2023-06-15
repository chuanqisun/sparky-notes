import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Panel,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  getIncomers,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "reactflow";

import "reactflow/dist/style.css";
import { useModelSelector } from "../account/model-selector";
import { useAuth } from "../account/use-auth";
import {
  ChatNode,
  ClaimSearchNode,
  TransformNode,
  chatViewModel,
  claimSearchViewModel,
  transformViewModel,
  type NodeData,
} from "../flow/custom-node/custom-node";
import { getH20Proxy } from "../hits/proxy";
import { getSemanticSearchProxy } from "../hits/search-claims";

const nodeTypes = {
  ClaimSearch: ClaimSearchNode,
  Chat: ChatNode,
  Transform: TransformNode,
};

const initialViewModel: Record<string, any> = {
  ClaimSearch: claimSearchViewModel,
  Chat: chatViewModel,
  Transform: transformViewModel,
} satisfies Record<keyof typeof nodeTypes, any>;

export interface GraphModel {
  nodes: Node[];
  edges: Edge[];
}

export const ShelfFlow: React.FC = () => {
  const { chat, ModelSelectorElement } = useModelSelector();
  const { accessToken } = useAuth();

  const h20Proxy = useMemo(() => getH20Proxy(accessToken), [accessToken]);
  const searchClaims = useMemo(() => getSemanticSearchProxy(h20Proxy), [h20Proxy]);

  const [model, setModel] = useState<GraphModel>({ nodes: [], edges: [] });

  // reducers
  const setNodes = useCallback((updateFn: (prevNodes: Node[]) => Node[]) => setModel((m) => ({ ...m, nodes: updateFn(m.nodes) })), []);
  const setEdges = useCallback((updateFn: (prevEdges: Edge[]) => Edge[]) => setModel((m) => ({ ...m, edges: updateFn(m.edges) })), []);
  const onNodesChange = useCallback<OnNodesChange>((changes) => setNodes((nodes) => applyNodeChanges(changes, nodes)), [setNodes]);
  const onEdgesChange = useCallback<OnEdgesChange>((changes) => setEdges((edges) => applyEdgeChanges(changes, edges)), [setEdges]);
  const onConnect = useCallback<OnConnect>((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const addNode = useCallback((node: Node) => setNodes((ns) => [...ns, node]), [setNodes]);
  const selectNode = useCallback((id: string) => setNodes((nodes) => nodes.map((node) => ({ ...node, selected: node.id === id }))), [setNodes]);

  const patchNodeData = useCallback(
    (id: string, data: any) => setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node))),
    [setNodes]
  );
  const patchNodeDataFn = useCallback(
    (id: string, updateFn: (prevData: any) => any) =>
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: updateFn(node.data) } : node))),
    [setNodes]
  );

  const getInputs = useCallback(
    (id: string) => {
      const node = model.nodes.find((node) => node.id === id);
      if (!node) return [];

      const inputNodes = getIncomers(node, model.nodes, model.edges).sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        else return a.position.x - b.position.x;
      });
      return inputNodes.map((node) => node.data.output as any[]);
    },
    [model.nodes, model.edges]
  );

  const addNodeByType = useCallback(
    (type: string) => {
      const id = crypto.randomUUID();

      const data: NodeData<any> = {
        context: {} as any, // will be injected
        output: [],
        viewModel: initialViewModel[type],
        setViewModel: (viewModel: any) => patchNodeData(id, { viewModel }),
        setOutput: (output: any[]) => patchNodeData(id, { output }),
        appendOutput: (output: any) => patchNodeDataFn(id, (prevData) => ({ ...prevData, output: [...prevData.output, output] })),
      };

      addNode({
        id,
        type,
        position: { x: 100, y: 100 },
        data,
      });
    },
    [addNode]
  );

  // views
  const nodes = model.nodes;
  const edges = model.edges;

  const nodesWithContext = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: { ...node.data, context: { chat, searchClaims, getInputs: getInputs.bind(null, node.id), selectNode: selectNode.bind(null, node.id) } },
      })),
    [nodes, chat, searchClaims, getInputs, selectNode]
  );

  useEffect(() => console.log("[DEBUG] nodes", nodes), [nodes]);

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      nodes={nodesWithContext}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      proOptions={{ hideAttribution: true }}
    >
      <Panel position="top-left">
        <button onClick={() => addNodeByType("ClaimSearch")}>Claim search</button>
        <button onClick={() => addNodeByType("Chat")}>Chat</button>
        <button onClick={() => addNodeByType("Transform")}>Transform</button>
      </Panel>
      <Panel position="top-right">{ModelSelectorElement}</Panel>
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default ShelfFlow;
