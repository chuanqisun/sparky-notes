import { memo } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import styled from "styled-components";
import { getSemanticSearchInput, type SemanticSearchProxy } from "../../hits/search-claims";
import { VerticalToolbar } from "./utils";

const theme = {
  scheme: "monokai",
  author: "wimer hazenberg (http://www.monokai.nl)",
  base00: "#272822",
  base01: "#383830",
  base02: "#49483e",
  base03: "#75715e",
  base04: "#a59f85",
  base05: "#f8f8f2",
  base06: "#f5f4f1",
  base07: "#f9f8f5",
  base08: "#f92672",
  base09: "#fd971f",
  base0A: "#f4bf75",
  base0B: "#a6e22e",
  base0C: "#a1efe4",
  base0D: "#66d9ef",
  base0E: "#ae81ff",
  base0F: "#cc6633",
};

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

  const handleClear = () => props.data.setOutput([]);

  return (
    <SelectableNode selected={props.selected}>
      <VerticalToolbar position={Position.Right} isVisible={true} align="start">
        <button onClick={handleRun}>Run</button>
        <button onClick={handleClear}>Clear</button>
      </VerticalToolbar>
      <Handle type="target" position={Position.Top} />
      <DragBar />
      <div className="nodrag">
        <input type="search" value={props.data.viewModel.query} onChange={(e) => props.data.setViewModel({ query: e.target.value })} />
      </div>
      <StyledOutput className="nowheel">
        <JSONTree theme={theme} hideRoot={true} data={props.data.output} />
      </StyledOutput>
      <Handle type="source" position={Position.Bottom} />
    </SelectableNode>
  );
});

const DragBar = styled.div`
  background-color: #ccc;
  height: 24px;
`;

const StyledOutput = styled.div`
  width: 320px;
  background-color: ${theme.base00};
  max-height: 400px;
  overflow-y: auto;
  color-scheme: dark;

  & > ul {
    margin: 0 4px !important;
  }
`;

const SelectableNode = styled.div<{ selected: boolean }>`
  background-color: #fff;
  border: 1px solid ${(props) => (props.selected ? "#00aaff" : "#ddd")};
`;
