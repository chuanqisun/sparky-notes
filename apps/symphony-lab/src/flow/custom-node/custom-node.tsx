import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import styled from "styled-components";
import { getSemanticSearchInput, type SemanticSearchProxy } from "../../hits/search-claims";
import { VerticalToolbar } from "./utils";

export interface NodeContext {
  chat: any;
  searchClaims: SemanticSearchProxy;
}

export interface NodeData<T = any> {
  context: NodeContext;
  output: any[];
  viewModel: T;
  setViewModel: (data: T) => void;
  setOutput: (output: any[]) => void;
  appendOutput: (output: any) => void;
}

export interface ClaimSearchNodeViewModel {
  query: string;
}

export const claimSearchNodeViewModel: ClaimSearchNodeViewModel = {
  query: "",
};

export const ClaimSearchNode = memo((props: NodeProps<NodeData<ClaimSearchNodeViewModel>>) => {
  const handleRun = async () => {
    console.log(props.data.viewModel.query);
    const searchResults = await props.data.context.searchClaims(getSemanticSearchInput(props.data.viewModel.query, 10));
    console.log(searchResults);
    props.data.setOutput(searchResults.value ?? []);
  };

  return (
    <SelectableNode selected={props.selected}>
      <VerticalToolbar position={Position.Right} align="start">
        <button onClick={handleRun}>Run</button>
        <button onClick={() => {}}>Clear</button>
      </VerticalToolbar>
      <Handle type="target" position={Position.Top} />
      <div className="nodrag">
        <input type="search" value={props.data.viewModel.query} onChange={(e) => props.data.setViewModel({ query: e.target.value })} />
      </div>
      <textarea className="nodrag" readOnly value={JSON.stringify(props.data.output)} />
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});

const SelectableNode = styled.div<{ selected: boolean }>`
  background-color: #fff;
  padding: 8px;
  border: 1px solid ${(props) => (props.selected ? "#00aaff" : "#ddd")};
`;
