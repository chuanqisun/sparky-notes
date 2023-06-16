import { memo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import { jqAutoPrompt } from "../../jq/jq-auto-prompt";
import { jsonToTyping, sampleJsonContent } from "../../jq/json-reflection";
import type { ChatMessage } from "../../openai/chat";
import { TextArea, TextAreaWrapper } from "./shared/form";
import type { NodeData } from "./shared/graph";
import { StyledOutput } from "./shared/json-view";
import { SelectableNode } from "./shared/selectable-node";
import { theme } from "./shared/theme";
import { TitleBar } from "./shared/title-bar";
import { TraceExplorer } from "./shared/trace-explorer";
import { useOutputList } from "./shared/use-output-list";

export interface TransformViewModel {
  plan: string;
  jq: string;
  isJqLocked: boolean;
}

export const transformViewModel: TransformViewModel = {
  plan: "",
  jq: "",
  isJqLocked: false,
};

export const TransformNode = memo((props: NodeProps<NodeData<TransformViewModel>>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldTrace, setShouldTrace] = useState(false);
  const { outputList, outputDataList } = useOutputList(props.data);

  const handleRun = async () => {
    const inputArray = props.data.context.getInputs()[0] ?? [];
    console.log("jq transform input", inputArray);
    // clear outputs
    props.data.clearTaskOutputs();

    // TODO handle provenance

    const output = await jqAutoPrompt({
      input: inputArray.map((item) => item.data),
      onGetChat: (messages: ChatMessage[]) => props.data.context.chat(messages, { max_tokens: 1200, temperature: 0 }),
      onGetUserMessage: ({ lastError }) =>
        lastError ? `The previous query failed with error: ${lastError}. Try a different query` : props.data.viewModel.plan,
      onJqString: (jqString: string) => props.data.setViewModel({ ...props.data.viewModel, jq: jqString }),
      onRetry: (errorMessage: string) => console.log(`Revising query based on error ${errorMessage}`),
      onShouldAbort: () => false, // TODO implement flow control
      onValidateResult: (result: any) => {
        if (!Array.isArray(result)) throw new Error("Result is not an array");
        // TODO support varying array length requires complex provenance
        if (result.length !== inputArray.length) throw new Error("Result array length does not match input array length");
      },
      getSystemMessage: ({ input, responseTemplate }) => `
Design with a jq filter that transforms a JSON array into the desired output. The json array is defined by the following type

\`\`\`typescript
${jsonToTyping(input)}
\`\`\`

Sample object:
\`\`\`json
${(JSON.stringify(sampleJsonContent(input)), null, 2)}
\`\`\`

Now respond in the format delimited by triple quotes:
"""
${responseTemplate}
"""`,
    });

    // TODO inject based on actually consumed source

    const taskId = crypto.randomUUID();
    props.data.setTaskOutputs(
      taskId,
      ((output as any[]) ?? []).map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: [inputArray[position].id] })) ?? []
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
        <TextAreaWrapper data-resize-textarea-content={props.data.viewModel.plan} maxheight={200}>
          <TextArea
            className="nowheel"
            placeholder="Plan"
            rows={1}
            value={props.data.viewModel.plan}
            onChange={(e: any) => props.data.setViewModel({ ...props.data.viewModel, plan: e.target.value })}
          />
        </TextAreaWrapper>
        <TextAreaWrapper data-resize-textarea-content={props.data.viewModel.jq} maxheight={200}>
          <TextArea
            className="nowheel"
            placeholder="JQ"
            rows={1}
            value={props.data.viewModel.jq}
            onChange={(e: any) => props.data.setViewModel({ ...props.data.viewModel, jq: e.target.value })}
          />
        </TextAreaWrapper>
        <label>
          <input
            type="checkbox"
            checked={props.data.viewModel.isJqLocked}
            onChange={(e: any) => props.data.setViewModel({ ...props.data.viewModel, isJqLocked: e.target.checked })}
          />
          Lock JQ
        </label>
      </div>
      {shouldTrace ? <TraceExplorer graph={props.data.context.graph} nodes={outputList} /> : null}
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={shouldTrace ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});
