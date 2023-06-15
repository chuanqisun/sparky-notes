import { memo, useEffect, useMemo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import styled from "styled-components";
import type { ChatProxy } from "../../account/model-selector";
import type { Cozo } from "../../cozo/cozo";
import { AutoResize } from "../../form/auto-resize";
import { getSemanticSearchInput, type SemanticSearchProxy } from "../../hits/search-claims";
import { jqAutoPrompt } from "../../jq/jq-auto-prompt";
import { jsonToTyping, sampleJsonContent } from "../../jq/json-reflection";
import type { ChatMessage } from "../../openai/chat";
import { getGraphOutputs } from "../db/db";

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
  chat: ChatProxy;
  graph: Cozo;
  searchClaims: SemanticSearchProxy;
  selectNode: () => void;
  getInputs: () => GraphOutputItem[][];
}

export interface NodeData<T = any> {
  context: NodeContext;
  taskIds: string[];
  output: any[];
  viewModel: T;
  setViewModel: (data: T) => void;
  setOutput: (output: any[]) => void;
  setTaskOutputs: (taskId: string, items: GraphOutputItem[]) => void;
  clearTaskOutputs: () => void;
  appendOutput: (output: any) => void;
}

// TODO track sources for each output
export interface GraphOutputItem {
  sourceIds: string[];
  id: string;
  position: number;
  data: any;
}

export interface ClaimSearchViewModel {
  query: string;
}

export const claimSearchViewModel: ClaimSearchViewModel = {
  query: "",
};

export interface TraceExplorerProps {
  graph: Cozo;
  id?: string;
}
export const TraceExplorer = (props: TraceExplorerProps) => {
  return <div>Magic happens here {props.id}!</div>;
};

export const ClaimSearchNode = memo((props: NodeProps<NodeData<ClaimSearchViewModel>>) => {
  const { outputList, outputDataList } = useOutputList(props.data);
  const [isProvenanceMode, setIsProvenanceMode] = useState(false);
  const handleRun = async () => {
    const taskId = crypto.randomUUID();
    console.log(props.data.viewModel.query);
    const searchResults = await props.data.context.searchClaims(getSemanticSearchInput(props.data.viewModel.query, 10));
    console.log(searchResults);
    props.data.setTaskOutputs(
      taskId,
      (searchResults.value ?? []).map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: [] })) ?? []
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [explorerRootId, setExplorerRootId] = useState<string>();

  return (
    <SelectableNode ref={containerRef} selected={props.selected} onFocus={() => props.data.context.selectNode()}>
      <Handle type="target" position={Position.Left} />
      <DragBar>
        {props.type}
        <div>
          <button onClick={() => setIsProvenanceMode((prev) => !prev)}>Trace</button>
          <button onClick={() => containerRef.current?.requestFullscreen()}>Max</button>
          <button onClick={handleRun}>Run</button>
          <button onClick={props.data.clearTaskOutputs}>Clear</button>
        </div>
      </DragBar>
      <div className="nodrag">
        <InputField type="search" value={props.data.viewModel.query} onChange={(e: any) => props.data.setViewModel({ query: e.target.value })} />
      </div>
      {isProvenanceMode ? (
        <TwoColumns className="nodrag nowheel">
          <div>
            {outputList.map((item) => (
              <div key={item.id}>
                <button onClick={() => setExplorerRootId(item.id)}>Item {item.position}</button>
              </div>
            ))}
          </div>
          <TraceExplorer id={explorerRootId} graph={props.data.context.graph} />
        </TwoColumns>
      ) : null}
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={isProvenanceMode ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1rem;
`;

export interface ChatNodeViewModel {
  template: string;
}

export const chatViewModel: ChatNodeViewModel = {
  template: "",
};

export const ChatNode = memo((props: NodeProps<NodeData<ChatNodeViewModel>>) => {
  const { outputList, outputDataList } = useOutputList(props.data);
  const [isProvenanceMode, setIsProvenanceMode] = useState(false);

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

    // combine all possible values
    const allParamCombos = combineNArrays(...bulkBindTemplateVariablesByPosition(templateVariables, stringInputs));
    console.log("Chat input combos", allParamCombos);

    const responseList: string[] = [];

    for (const paramCombo of allParamCombos) {
      const renderedTemplate = renderTemplate(props.data.viewModel.template, paramCombo);
      const response = await props.data.context.chat([{ role: "user", content: renderedTemplate }]);
      responseList.push(response);
      const outputItems = responseList.map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: [] }));

      const taskId = crypto.randomUUID();
      props.data.setTaskOutputs(taskId, outputItems);
    }
  };

  return (
    <SelectableNode selected={props.selected} onFocus={() => props.data.context.selectNode()}>
      <Handle type="target" position={Position.Left} />
      <DragBar>
        {props.type}
        <div>
          <label>
            <input type="checkbox" checked={isProvenanceMode} onChange={(e) => setIsProvenanceMode(e.target.checked)} />
            Debug
          </label>
          <button onClick={handleRun}>Run</button>
          <button onClick={props.data.clearTaskOutputs}>Clear</button>
        </div>
      </DragBar>
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
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={isProvenanceMode ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>

      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});

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
  const { outputList, outputDataList } = useOutputList(props.data);
  const [isProvenanceMode, setIsProvenanceMode] = useState(false);

  const handleRun = async () => {
    const inputArray = props.data.context.getInputs()[0] ?? [];
    console.log("jq transform input", inputArray);
    // clear outputs
    props.data.clearTaskOutputs();

    const output = await jqAutoPrompt({
      input: inputArray,
      onGetChat: (messages: ChatMessage[]) => props.data.context.chat(messages, { max_tokens: 1200, temperature: 0 }),
      onGetUserMessage: ({ lastError }) =>
        lastError ? `The previous query failed with error: ${lastError}. Try a different query` : props.data.viewModel.plan,
      onJqString: (jqString: string) => props.data.setViewModel({ ...props.data.viewModel, jq: jqString }),
      onRetry: (errorMessage: string) => console.log(`Revising query based on error ${errorMessage}`),
      onShouldAbort: () => false, // TODO implement flow control
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

    const taskId = crypto.randomUUID();
    // TODO inject sourceIds
    props.data.setTaskOutputs(
      taskId,
      ((output as any[]) ?? []).map((value, position) => ({ data: value, position, id: crypto.randomUUID(), sourceIds: [] })) ?? []
    );
  };

  return (
    <SelectableNode selected={props.selected} onFocus={() => props.data.context.selectNode()}>
      <Handle type="target" position={Position.Left} />
      <DragBar>
        {props.type}
        <div>
          <label>
            <input type="checkbox" checked={isProvenanceMode} onChange={(e) => setIsProvenanceMode(e.target.checked)} />
            Debug
          </label>
          <button onClick={handleRun}>Run</button>
          <button onClick={props.data.clearTaskOutputs}>Clear</button>
        </div>
      </DragBar>
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
      <StyledOutput className="nodrag nowheel">
        {outputDataList.length ? <JSONTree theme={theme} hideRoot={true} data={isProvenanceMode ? outputList : outputDataList} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});

/***********************
 Node Develoopment Kit
 ***********************/

export const DragBar = styled.div`
  font-weight: 700;
  font-size: 12px;
  padding: 4px;
  color: var(--drag-bar-color);
  background-color: var(--drag-bar-background);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const InputField = styled.input`
  width: 100%;
  padding: 4px;
`;

const TextAreaWrapper = styled(AutoResize)`
  --input-padding-block: 4px;
  --input-padding-inline: 4px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 4px;
  resize: vertical;
  max-height: 400px;
  overflow-y: auto;
`;

const StyledOutput = styled.div`
  width: 100%;
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
  width: 320px;
  border-radius: 4px;
  overflow: hidden;
  --drag-bar-background: ${(props) => (props.selected ? "#0077ff" : "#ddd")};
  --drag-bar-color: ${(props) => (props.selected ? "#fff" : "#000")};
`;

function combineTwoArrays(arr1: any[], arr2: any[]): any[] {
  const combinations = [];
  for (let i = 0; i < arr1.length; i++) {
    for (let j = 0; j < arr2.length; j++) {
      combinations.push({ ...arr1[i], ...arr2[j] });
    }
  }
  return combinations;
}

function combineNArrays(...arrs: any[][]) {
  // use reducer and `combineTwoArrays` to combine all arrays
  return arrs.reduce((acc, arr) => combineTwoArrays(acc, arr));
}

function getTemplateVariables(template: string) {
  return [...template.matchAll(/\{([^\}]+)\}/g)].map((match) => match[1]);
}

function bulkBindTemplateVariablesByPosition(variables: string[], inputs: any[][]) {
  const variableWithValues = variables.map((variable, variableIndex) => {
    return inputs[variableIndex].map((input) => ({ [variable]: input }));
  });

  return variableWithValues;
}

// for each variable, use the corresponding input to get a list of possible values

function renderTemplate(template: string, params: any) {
  return template.replace(/\{([^\}]+)\}/g, (_, p1) => {
    return params[p1];
  });
}

export function useOutputList(nodeData: NodeData) {
  const [outputList, setOutputList] = useState<GraphOutputItem[]>([]);
  const currentTaskId = useMemo(() => nodeData.taskIds.at(-1), [nodeData.taskIds]);
  useEffect(() => {
    if (currentTaskId) {
      const outputs = getGraphOutputs(nodeData.context.graph, currentTaskId);
      setOutputList(outputs);
    } else {
      setOutputList([]);
    }
  }, [currentTaskId]);

  const outputDataList = useMemo(() => outputList.map((output) => output.data), [outputList]);

  return { outputList, outputDataList };
}
