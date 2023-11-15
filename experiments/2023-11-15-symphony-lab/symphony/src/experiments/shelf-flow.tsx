import type React from "react";
import { useCallback, useMemo, useState } from "react";
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

import { useAuth } from "@h20/auth/react-hooks";
import "reactflow/dist/style.css";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { ChatNode, chatViewModel } from "../flow/custom-node/chat";
import { ClaimSearchNode, claimSearchLens, claimSearchViewModel } from "../flow/custom-node/claim-search";
import { JsonNode, jsonViewModel } from "../flow/custom-node/json";
import { ListNode, listViewModel } from "../flow/custom-node/list";
import { MapNode, mapViewModel } from "../flow/custom-node/map";
import type { GraphOutputItem, GraphTaskData, NodeContext, NodeData } from "../flow/custom-node/shared/graph";
import { TraceGraph, TraceGraphContainer } from "../flow/custom-node/shared/trace-explorer";
import { useMeasure } from "../flow/custom-node/shared/use-measure";
import { getGraphOutputs, setGraphOutput, setTask } from "../flow/db/db";
import { getH20Proxy } from "../hits/proxy";
import { getSemanticSearchProxy } from "../hits/search-claims";

const nodeTypes = {
  Json: JsonNode,
  List: ListNode,
  ClaimSearch: ClaimSearchNode,
  Chat: ChatNode,
  Map: MapNode,
};

const taskLenses = {
  ClaimSearch: claimSearchLens,
};

const initialViewModel: Record<string, any> = {
  Json: jsonViewModel,
  List: listViewModel,
  ClaimSearch: claimSearchViewModel,
  Chat: chatViewModel,
  Map: mapViewModel,
} satisfies Record<keyof typeof nodeTypes, any>;

export interface GraphModel {
  nodes: Node[];
  edges: Edge[];
}

export interface ShelfFlowProps {
  graph: Cozo;
}
export const ShelfFlow: React.FC<ShelfFlowProps> = (props) => {
  const { graph } = props;
  const { chat, ModelSelectorElement } = useModelSelector();
  const { accessToken } = useAuth({ serverHost: import.meta.env.VITE_H20_SERVER_HOST, webHost: import.meta.env.VITE_WEB_HOST });

  const h20Proxy = useMemo(() => getH20Proxy(accessToken), [accessToken]);
  const searchClaims = useMemo(() => getSemanticSearchProxy(h20Proxy), [h20Proxy]);

  const [model, setModel] = useState<GraphModel>({ nodes: [], edges: [] });
  const [selectedOutputId, setSelectedOutputId] = useState<string>();
  const [visRef, visRect] = useMeasure<HTMLDivElement>();
  console.log(visRect);

  // reducers
  const setNodes = useCallback((updateFn: (prevNodes: Node[]) => Node[]) => setModel((m) => ({ ...m, nodes: updateFn(m.nodes) })), []);
  const setEdges = useCallback((updateFn: (prevEdges: Edge[]) => Edge[]) => setModel((m) => ({ ...m, edges: updateFn(m.edges) })), []);
  const onNodesChange = useCallback<OnNodesChange>((changes) => setNodes((nodes) => applyNodeChanges(changes, nodes)), [setNodes]);
  const onEdgesChange = useCallback<OnEdgesChange>((changes) => setEdges((edges) => applyEdgeChanges(changes, edges)), [setEdges]);
  const onConnect = useCallback<OnConnect>((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);
  const addNode = useCallback((node: Node) => setNodes((ns) => [...ns, node]), [setNodes]);
  const selectNode = useCallback((id: string) => setNodes((nodes) => nodes.map((node) => ({ ...node, selected: node.id === id }))), [setNodes]);

  const patchNodeData = useCallback(
    (id: string, data: Partial<NodeData>) => setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node))),
    [setNodes]
  );
  const patchNodeDataFn = useCallback(
    (id: string, updateFn: (prevData: NodeData) => NodeData) =>
      setNodes((nodes) => nodes.map((node) => (node.id === id ? { ...node, data: updateFn(node.data) } : node))),
    [setNodes]
  );

  const getInputs = useCallback(
    (id: string) => {
      const node = model.nodes.find((node) => node.id === id);
      if (!node) return [];

      const inputNodes = getIncomers<NodeData>(node, model.nodes, model.edges).sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        else return a.position.x - b.position.x;
      });
      return inputNodes.map((node) => getGraphOutputs(graph, node.data.taskIds.at(-1)));
    },
    [model.nodes, model.edges]
  );

  const addNodeByType = useCallback(
    (type: string) => {
      const id = crypto.randomUUID();

      const data: NodeData<any> = {
        context: {} as any, // will be injected
        output: [],
        taskIds: [],
        viewModel: initialViewModel[type],
        clearTaskOutputs: () => {
          // soft clear
          patchNodeData(id, { taskIds: [] });
        },
        setViewModel: (viewModel: any) => patchNodeData(id, { viewModel }),
        setOutput: (output: any[]) => {
          patchNodeData(id, { output });
        },
        setTask: (taskId: string, data: GraphTaskData) => {
          setTask(graph, taskId, data);
        },
        setTaskOutputs: (taskId: string, items: GraphOutputItem[]) => {
          items.forEach((item) => setGraphOutput(graph, taskId, item));
          patchNodeDataFn(id, (prevData) => ({ ...prevData, taskIds: [...prevData.taskIds.filter((existingId: any) => existingId !== taskId), taskId] }));
        },
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
      nodes.map((node) => {
        const context: NodeContext = {
          chat,
          graph,
          searchClaims,
          getInputs: getInputs.bind(null, node.id),
          selectNode: selectNode.bind(null, node.id),
          onSelectOutput: setSelectedOutputId,
        };

        return {
          ...node,
          data: { ...node.data, context },
        };
      }),
    [nodes, graph, chat, searchClaims, getInputs, selectNode]
  );

  // useEffect(() => console.log("[DEBUG] nodes", nodes), [nodes]);

  return (
    <>
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
          <button onClick={() => addNodeByType("Json")}>JSON</button>
          <button onClick={() => addNodeByType("ClaimSearch")}>Claim search</button>
          <button onClick={() => addNodeByType("List")}>List</button>
          <button onClick={() => addNodeByType("Chat")}>Chat</button>
          <button onClick={() => addNodeByType("Map")}>Map</button>
        </Panel>
        <Panel position="top-right">{ModelSelectorElement}</Panel>

        <Controls />
        <Background />
      </ReactFlow>
      <TraceGraphContainer ref={visRef}>
        {selectedOutputId ? (
          <div>
            <button onClick={() => setSelectedOutputId(undefined)}>Close</button>
          </div>
        ) : null}
        {selectedOutputId ? <TraceGraph lens={taskLenses} width={visRect?.width ?? 0} height={320} graph={props.graph} id={selectedOutputId} /> : null}
      </TraceGraphContainer>
    </>
  );
};

export default ShelfFlow;
