import { memo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import { TextArea, TextAreaWrapper } from "./shared/form";
import type { NodeData } from "./shared/graph";
import { StyledOutput } from "./shared/json-view";
import { SelectableNode } from "./shared/selectable-node";
import { bulkBindTemplateVariablesByPositionV2, getInputCombos, getTemplateVariables, renderTemplate } from "./shared/template";
import { theme } from "./shared/theme";
import { TitleBar } from "./shared/title-bar";
import { TraceExplorer } from "./shared/trace-explorer";
import { useOutputList } from "./shared/use-output-list";

export interface ChatNodeViewModel {
  template: string;
}

export const chatViewModel: ChatNodeViewModel = {
  template: "",
};

export const ChatNode = memo((props: NodeProps<NodeData<ChatNodeViewModel>>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldTrace, setShouldTrace] = useState(false);
  const { outputList, outputDataList } = useOutputList(props.data);

  const handleRun = async () => {
    console.log(props.data.context.getInputs());

    // clear output first
    props.data.clearTaskOutputs();

    // extract all curly brace surrounded variables
    const inputs = props.data.context.getInputs();
    const templateVariables = getTemplateVariables(props.data.viewModel.template);

    if (templateVariables.length !== inputs.length) {
      throw new Error("Template variables and inputs do not match");
    }

    // get strings for each input
    const stringInputs = inputs.map((list) => list.map((item) => (typeof item.data === "string" ? item.data : JSON.stringify(item.data))));

    const itemInputs = inputs.map((list) => list.map((item) => (typeof item.data === "string" ? item : { ...item, data: JSON.stringify(item.data) })));
    const namedInputs = bulkBindTemplateVariablesByPositionV2(templateVariables, itemInputs);
    const combos = getInputCombos(namedInputs);
    console.log("Chat input combos", combos);
    debugger;

    // combine all possible values
    // const allParamCombos = combineNArrays(...bulkBindTemplateVariablesByPosition(templateVariables, stringInputs));
    // console.log("Chat input combos", allParamCombos);

    const responseList: string[] = [];

    for (const paramCombo of combos) {
      const renderedTemplate = renderTemplate(props.data.viewModel.template, paramCombo.variablesDict);
      const response = await props.data.context.chat([{ role: "user", content: renderedTemplate }]);
      responseList.push(response);
      const outputItems = responseList.map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: paramCombo.sourceIds }));

      const taskId = crypto.randomUUID();
      props.data.setTaskOutputs(taskId, outputItems);
    }
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
        <TextAreaWrapper data-resize-textarea-content={props.data.viewModel.template} maxheight={200}>
          <TextArea
            className="nowheel"
            rows={1}
            value={props.data.viewModel.template}
            onChange={(e: any) => props.data.setViewModel({ template: e.target.value })}
          />
        </TextAreaWrapper>
      </div>
      {shouldTrace ? <TraceExplorer graph={props.data.context.graph} nodes={outputList} /> : null}
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={shouldTrace ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});
