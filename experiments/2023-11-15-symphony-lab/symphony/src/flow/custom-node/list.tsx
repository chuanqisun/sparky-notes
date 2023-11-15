import { memo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import { TextArea, TextAreaWrapper } from "./shared/form";
import type { NodeData } from "./shared/graph";
import { StyledOutput } from "./shared/json-view";
import { SelectableNode } from "./shared/selectable-node";
import { theme } from "./shared/theme";
import { TitleBar } from "./shared/title-bar";
import { TraceExplorer } from "./shared/trace-explorer";
import { useOutputList } from "./shared/use-output-list";

export interface ListViewModel {
  rawList: string;
}

export const listViewModel: ListViewModel = {
  rawList: "- Item 1",
};

export const ListNode = memo((props: NodeProps<NodeData<ListViewModel>>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldTrace, setShouldTrace] = useState(false);
  const { outputList, outputDataList } = useOutputList(props.data);
  const handleRun = async () => {
    const taskId = crypto.randomUUID();
    const textItems = props.data.viewModel.rawList
      .split("\n")
      .map((item) => item.trim().match(/^- (.*)$/)?.[1])
      .filter(Boolean) as string[];

    props.data.setTask(taskId, { name: "List" });
    props.data.setTaskOutputs(taskId, textItems.map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: [] })) ?? []);
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
        <TextAreaWrapper data-resize-textarea-content={props.data.viewModel.rawList} maxheight={200}>
          <TextArea
            className="nowheel"
            rows={1}
            value={props.data.viewModel.rawList}
            onChange={(e: any) => props.data.setViewModel({ rawList: e.target.value })}
          />
        </TextAreaWrapper>
      </div>
      {shouldTrace ? <TraceExplorer onSelect={props.data.context.onSelectOutput} nodes={outputList} /> : null}
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={shouldTrace ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});
