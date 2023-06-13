import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import styled from "styled-components";

export interface CustomNodeProps {
  model: any;
  setModel: (data: any) => void;
}
export const CustomSourceNode = memo((props: NodeProps<CustomNodeProps>) => {
  return (
    <SelectableNode selected={props.selected}>
      <textarea className="nodrag" value={JSON.stringify(props.data.model)} onChange={(e) => props.data.setModel(JSON.parse(e.target.value))} />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});

export const CustomPipeNode = memo((props: NodeProps<CustomNodeProps>) => {
  return (
    <SelectableNode selected={props.selected}>
      <Handle type="target" position={Position.Top} />
      <textarea className="nodrag" value={JSON.stringify(props.data.model)} onChange={(e) => props.data.setModel(JSON.parse(e.target.value))} />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});

export const CustomSinkNode = memo((props: NodeProps<CustomNodeProps>) => {
  return (
    <SelectableNode selected={props.selected}>
      <Handle type="target" position={Position.Top} />
      <textarea className="nodrag" value={JSON.stringify(props.data.model)} onChange={(e) => props.data.setModel(JSON.parse(e.target.value))} />
    </SelectableNode>
  );
});

const SelectableNode = styled.div<{ selected: boolean }>`
  background-color: #fff;
  padding: 8px;
  border: 1px solid ${(props) => (props.selected ? "#00aaff" : "#ddd")};
`;
