import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Panel,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "reactflow";

import "reactflow/dist/style.css";
import { useModelSelector } from "../account/model-selector";
import { useAuth } from "../account/use-auth";
import { ClaimSearchNode, claimSearchNodeViewModel, type NodeContext, type NodeData } from "../flow/custom-node/custom-node";
import { getH20Proxy } from "../hits/proxy";
import { getSemanticSearchProxy } from "../hits/search-claims";

const nodeTypes = {
  claimSearch: ClaimSearchNode,
};

const initialViewModel: Record<string, any> = {
  claimSearch: claimSearchNodeViewModel,
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

  const patchNodeData = useCallback(
    (id: string, data: any) => setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node))),
    [setNodes]
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
        appendOutput: (output: any) => patchNodeData(id, { output: [...(model.nodes.find((n) => n.id === id)?.data.output || []), output] }),
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

  const nodeContext: NodeContext = useMemo(() => ({ chat, searchClaims }), [chat, searchClaims]);
  const nodesWithContext = useMemo(() => nodes.map((node) => ({ ...node, data: { ...node.data, context: nodeContext } })), [nodes, nodeContext]);

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
        <button onClick={() => addNodeByType("claimSearch")}>Add claim search</button>
      </Panel>
      <Panel position="top-right">{ModelSelectorElement}</Panel>
      <Panel position="bottom-left">test tes test</Panel>
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default ShelfFlow;
