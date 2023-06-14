import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import styled from "styled-components";

export interface CustomNodeData<T = any> {
  template: string;
  viewModel: T;
  setViewModel: (data: T) => void;
}
export const CustomSourceNode = memo((props: NodeProps<CustomNodeData>) => {
  const InnerComponent = useMemo(() => useNodeView(props.data.template), [props.data.template]);
  return (
    <SelectableNode selected={props.selected}>
      {InnerComponent ? <InnerComponent data={props.data.viewModel} setData={props.data.setViewModel} /> : null}
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});

export const CustomPipeNode = memo((props: NodeProps<CustomNodeData>) => {
  const InnerComponent = useMemo(() => useNodeView(props.data.template), [props.data.template]);
  return (
    <SelectableNode selected={props.selected}>
      <Handle type="target" position={Position.Top} />
      {InnerComponent ? <InnerComponent data={props.data.viewModel} setData={props.data.setViewModel} /> : null}
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});

export const CustomSinkNode = memo((props: NodeProps<CustomNodeData>) => {
  const InnerComponent = useMemo(() => useNodeView(props.data.template), [props.data.template]);
  return (
    <SelectableNode selected={props.selected}>
      <Handle type="target" position={Position.Top} />
      {InnerComponent ? <InnerComponent data={props.data.viewModel} setData={props.data.setViewModel} /> : null}
    </SelectableNode>
  );
});

const SelectableNode = styled.div<{ selected: boolean }>`
  background-color: #fff;
  padding: 8px;
  border: 1px solid ${(props) => (props.selected ? "#00aaff" : "#ddd")};
`;

export interface NodeViewProps<T = any> {
  data: T;
  setData: (data: T) => void;
}

export function useNodeView(template: string) {
  switch (template) {
    case "claimSearch":
      return ClaimSearchView;
    default:
      return DebugView;
  }
}

export const ClaimSearchView = (props: NodeViewProps) => {
  return (
    <div>
      <input type="search" />
      <ul>
        <li>Claim 1</li>
      </ul>
    </div>
  );
};

export const DebugView = (props: NodeViewProps) => {
  return <textarea className="nodrag" value={JSON.stringify(props.data)} onChange={(e) => props.setData(JSON.parse(e.target.value))} />;
};
