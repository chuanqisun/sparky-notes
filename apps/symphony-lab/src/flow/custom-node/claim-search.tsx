import { memo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import { getSemanticSearchInput } from "../../hits/search-claims";
import { InputField } from "./shared/form";
import type { NodeData } from "./shared/graph";
import { StyledOutput } from "./shared/json-view";
import { SelectableNode } from "./shared/selectable-node";
import { theme } from "./shared/theme";
import { TitleBar } from "./shared/title-bar";
import { TraceExplorer } from "./shared/trace-explorer";
import { useOutputList } from "./shared/use-output-list";

export interface ClaimSearchViewModel {
  query: string;
}

export const claimSearchViewModel: ClaimSearchViewModel = {
  query: "",
};

export const ClaimSearchNode = memo((props: NodeProps<NodeData<ClaimSearchViewModel>>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldTrace, setShouldTrace] = useState(false);
  const { outputList, outputDataList } = useOutputList(props.data);
  const handleRun = async () => {
    const taskId = crypto.randomUUID();
    console.log(props.data.viewModel.query);
    const searchResults = await props.data.context.searchClaims(getSemanticSearchInput(props.data.viewModel.query, 10));
    console.log(searchResults);
    props.data.setTask(taskId, { name: "Claim search" });
    props.data.setTaskOutputs(
      taskId,
      (searchResults.value ?? []).map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: [] })) ?? []
    );
  };

  return (
    <SelectableNode ref={containerRef} selected={props.selected} onFocus={() => props.data.context.selectNode()}>
      <Handle type="target" position={Position.Left} />
      <TitleBar
        title={props.type}
        isDebug={shouldTrace}
        onSetDebug={(v) => setShouldTrace(v)}
        maxTargetRef={containerRef}
        onRun={handleRun}
        onClear={props.data.clearTaskOutputs}
      />
      <div className="nodrag">
        <InputField type="search" value={props.data.viewModel.query} onChange={(e: any) => props.data.setViewModel({ query: e.target.value })} />
      </div>
      {shouldTrace ? <TraceExplorer onSelect={props.data.context.onSelectOutput} nodes={outputList} /> : null}
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={shouldTrace ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});
