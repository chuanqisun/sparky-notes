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
import { CustomPipeNode, CustomSinkNode, CustomSourceNode, type CustomNodeData } from "../flow/custom-node/custom-node";

const nodeTypes = {
  source: CustomSourceNode,
  pipe: CustomPipeNode,
  sink: CustomSinkNode,
};

export interface GraphModel {
  nodes: Node[];
  edges: Edge[];
}

export const ShelfFlow: React.FC = () => {
  const { chat, ModelSelectorElement } = useModelSelector();

  const [model, setModel] = useState<GraphModel>({ nodes: [], edges: [] });

  // reducers
  const setNodes = useCallback((updateFn: (prevNodes: Node[]) => Node[]) => setModel((m) => ({ ...m, nodes: updateFn(m.nodes) })), []);
  const setEdges = useCallback((updateFn: (prevEdges: Edge[]) => Edge[]) => setModel((m) => ({ ...m, edges: updateFn(m.edges) })), []);
  const onNodesChange = useCallback<OnNodesChange>((changes) => setNodes((nodes) => applyNodeChanges(changes, nodes)), [setNodes]);
  const onEdgesChange = useCallback<OnEdgesChange>((changes) => setEdges((edges) => applyEdgeChanges(changes, edges)), [setEdges]);
  const onConnect = useCallback<OnConnect>((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const addNode = useCallback((node: Node) => setNodes((ns) => [...ns, node]), [setNodes]);

  const createNodeByTemplate = useCallback(
    (type: keyof typeof nodeTypes, template: string) => {
      const id = crypto.randomUUID();
      const data: CustomNodeData = {
        template,
        viewModel: {},
        setViewModel: (viewModel: any) => setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, viewModel } } : node))),
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

  useEffect(() => console.log("[DEBUG] nodes", nodes), [nodes]);

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
        <button onClick={() => createNodeByTemplate("source", "claimSearch")}>Add claim search</button>
        <button onClick={() => createNodeByTemplate("source", "")}>Add basic list</button>
        <button onClick={() => createNodeByTemplate("pipe", "")}>Add pipe</button>
        <button onClick={() => createNodeByTemplate("sink", "")}>Add sink</button>
      </Panel>
      <Panel position="top-right">{ModelSelectorElement}</Panel>
      <Panel position="bottom-left">test tes test</Panel>
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default ShelfFlow;
