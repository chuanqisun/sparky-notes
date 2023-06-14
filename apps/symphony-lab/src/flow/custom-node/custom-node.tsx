import { memo } from "react";
import { JSONTree } from "react-json-tree";
import { Handle, Position, type NodeProps } from "reactflow";
import styled from "styled-components";
import type { ChatProxy } from "../../account/model-selector";
import { AutoResize } from "../../form/auto-resize";
import { getSemanticSearchInput, type SemanticSearchProxy } from "../../hits/search-claims";
import { jqAutoPrompt } from "../../jq/jq-auto-prompt";
import { jsonToTyping, sampleJsonContent } from "../../jq/json-reflection";
import type { ChatMessage } from "../../openai/chat";

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
  searchClaims: SemanticSearchProxy;
  getInputs: () => any[][];
}

export interface NodeData<T = any> {
  context: NodeContext;
  output: any[];
  viewModel: T;
  setViewModel: (data: T) => void;
  setOutput: (output: any[]) => void;
  appendOutput: (output: any) => void;
}

export interface ClaimSearchViewModel {
  query: string;
}

export const claimSearchViewModel: ClaimSearchViewModel = {
  query: "",
};

export const ClaimSearchNode = memo((props: NodeProps<NodeData<ClaimSearchViewModel>>) => {
  const handleRun = async () => {
    console.log(props.data.viewModel.query);
    const searchResults = await props.data.context.searchClaims(getSemanticSearchInput(props.data.viewModel.query, 10));
    console.log(searchResults);
    props.data.setOutput(searchResults.value ?? []);
  };

  const handleClear = () => props.data.setOutput([]);

  return (
    <SelectableNode selected={props.selected}>
      <Handle type="target" position={Position.Left} />
      <DragBar>
        {props.type}
        <div>
          <button onClick={handleRun}>Run</button>
          <button onClick={handleClear}>Clear</button>
        </div>
      </DragBar>
      <div className="nodrag">
        <InputField type="search" value={props.data.viewModel.query} onChange={(e: any) => props.data.setViewModel({ query: e.target.value })} />
      </div>
      <StyledOutput className="nowheel">
        {props.data.output.length ? <JSONTree theme={theme} hideRoot={true} data={props.data.output} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});

export interface ChatNodeViewModel {
  template: string;
}

export const chatViewModel: ChatNodeViewModel = {
  template: "",
};

export const ChatNode = memo((props: NodeProps<NodeData<ChatNodeViewModel>>) => {
  const handleRun = async () => {
    console.log(props.data.context.getInputs());
    const response = await props.data.context.chat([{ role: "user", content: props.data.viewModel.template }]);
    props.data.setOutput([response]);
  };

  const handleClear = () => props.data.setOutput([]);

  return (
    <SelectableNode selected={props.selected}>
      <Handle type="target" position={Position.Left} />
      <DragBar>
        {props.type}
        <div>
          <button onClick={handleRun}>Run</button>
          <button onClick={handleClear}>Clear</button>
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
      <StyledOutput className="nowheel">
        {props.data.output.length ? <JSONTree theme={theme} hideRoot={true} data={props.data.output} /> : "Empty"}
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
  const handleRun = async () => {
    console.log(props.data.context.getInputs());
    const output = await jqAutoPrompt({
      input: props.data.context.getInputs()[0] ?? [],
      onGetChat: (messages: ChatMessage[]) => props.data.context.chat(messages, { max_tokens: 800 }),
      onGetUserMessage: ({ lastError }) =>
        lastError ? `The previous query failed with error: ${lastError}. Try a different query` : props.data.viewModel.plan,
      onJqString: (jqString: string) => props.data.setViewModel({ ...props.data.viewModel, jq: jqString }),
      onRetry: (errorMessage: string) => console.log(`Revising query based on error ${errorMessage}`),
      onShouldAbort: () => false, // TODO implement flow control
      getSystemMessage: ({ input, responseTemplate }) => `
  You are an expert in querying json with jq. The input is defined by the following type
\`\`\`typescript
${jsonToTyping(input)}
\`\`\`

Sample input:
\`\`\`json
${(JSON.stringify(sampleJsonContent(input)), null, 2)}
\`\`\`

The user will provide a query goal, and you will respond with the jq query.

Response format:

${responseTemplate}`,
    });

    console.log(`jq output: ${output}`);

    props.data.setOutput(output);
  };

  const handleClear = () => props.data.setOutput([]);

  return (
    <SelectableNode selected={props.selected}>
      <Handle type="target" position={Position.Left} />
      <DragBar>
        {props.type}
        <div>
          <button onClick={handleRun}>Run</button>
          <button onClick={handleClear}>Clear</button>
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
      <StyledOutput className="nowheel">
        {props.data.output.length ? <JSONTree theme={theme} hideRoot={true} data={props.data.output} /> : "Empty"}
      </StyledOutput>
      <Handle type="source" position={Position.Right} />
    </SelectableNode>
  );
});

// NDK
export const DragBar = styled.div`
  font-weight: 700;
  font-size: 12px;
  padding: 4px;
  background-color: #ccc;
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
  border: 1px solid ${(props) => (props.selected ? "#00aaff" : "#ddd")};
  width: 320px;
`;
