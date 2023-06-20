import { memo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeData } from "./shared/graph";
import { StyledOutput } from "./shared/json-view";
import { SelectableNode } from "./shared/selectable-node";
import { theme } from "./shared/theme";
import { TitleBar } from "./shared/title-bar";
import { TraceExplorer } from "./shared/trace-explorer";
import { useOutputList } from "./shared/use-output-list";

export interface JsonViewModel {
  file?: File;
}

export const jsonViewModel: JsonViewModel = {};

export const JsonNode = memo((props: NodeProps<NodeData<JsonViewModel>>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldTrace, setShouldTrace] = useState(false);
  const { outputList, outputDataList } = useOutputList(props.data);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleRun = async () => {
    const taskId = crypto.randomUUID();
    props.data.setTask(taskId, { name: "Json" });
    const jsonFile = inputRef.current?.files?.[0];
    if (!jsonFile) return;
    const obj = JSON.parse(await jsonFile.text());

    // coerce to array
    const array = Array.isArray(obj) ? obj : [obj];
    props.data.setTaskOutputs(taskId, array.map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: [] })) ?? []);
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
        <input ref={inputRef} type="file" />
      </div>
      {shouldTrace ? <TraceExplorer onSelect={props.data.context.onSelectOutput} nodes={outputList} /> : null}
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={shouldTrace ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});
