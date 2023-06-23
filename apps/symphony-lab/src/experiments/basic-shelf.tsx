import type { CozoDb } from "cozo-lib-wasm";
import type React from "react";
import { useMemo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { rateLimitQueue, withAsyncQueue } from "../http/rate-limit";
import { jqAutoPrompt } from "../jq/jq-auto-prompt";
import { jsAutoPromptV2 } from "../jq/js-auto-prompt-v2";
import type { ChatMessage } from "../openai/chat";
import { CenterClamp } from "../shell/center-clamp";

export interface BasicShelfProps {
  db: CozoDb;
}

export const BasicShelf: React.FC<BasicShelfProps> = ({ db }) => {
  const graph = useRef(new Cozo(db));

  const { chat, ModelSelectorElement, embed } = useModelSelector();

  const rateLimitedChat = useMemo(() => {
    const queue = rateLimitQueue(300, 0.1);
    const rateLimitedProxy = withAsyncQueue(queue, chat);
    return rateLimitedProxy;
  }, [chat]);

  const [shelf, setShelf] = useState<any>({});
  const [userMessage, setUserMessage] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    setUserMessage("");
    if (userMessage.startsWith("/json")) {
      const [fileHandle] = (await (window as any).showOpenFilePicker()) as FileSystemFileHandle[];
      const file = await fileHandle.getFile();
      const jsonText = await file.text();
      setStatus("Imported JSON file");
      try {
        setShelf(JSON.parse(jsonText));
      } catch {}
    } else if (userMessage.startsWith("/code")) {
      const codePlan = userMessage.slice("/code".length).trim();
      const output = await jsAutoPromptV2({
        input: shelf,
        onGetChat: (messages: ChatMessage[]) => rateLimitedChat(messages, { max_tokens: 1200, temperature: 0 }),
        onGetUserMessage: ({ lastError }) =>
          lastError ? `The previous function call failed with error: ${lastError}. Try a different query` : `Goal: ${codePlan}`,
      });

      setShelf(output);
    } else if (userMessage.startsWith("/jq")) {
      const jqPlan = userMessage.slice("/jq".length).trim();
      const output = await jqAutoPrompt({
        input: shelf,
        onGetChat: (messages: ChatMessage[]) => rateLimitedChat(messages, { max_tokens: 1200, temperature: 0 }),
        onGetUserMessage: ({ lastError }) => (lastError ? `The previous query failed with error: ${lastError}. Try a different query` : jqPlan),
        onJqString: (jq) => setStatus(`jq: ${jq}`),
        onRetry: (error) => setStatus(`retry due to ${error}`),
      });

      setShelf(output);
    } else if (userMessage.startsWith("/tag")) {
      throw new Error("Not implemented");
    } else if (userMessage.startsWith("/list")) {
      const listDescription = userMessage.slice("/list".length).trim();

      const output = await jqAutoPrompt({
        input: shelf,
        onGetChat: (messages: ChatMessage[]) => chat(messages, { max_tokens: 1200, temperature: 0 }),
        onGetUserMessage: ({ lastError }) => (lastError ? `The previous query failed with error: ${lastError}. Try a different query` : listDescription),
        onJqString: (jq) => setStatus(`jq: ${jq}`),
        onRetry: (error) => setStatus(`retry due to ${error}`),
        onValidateResult: (result) => {
          if (!Array.isArray(result)) {
            throw new Error("The result must be a list");
          }
        },
      });

      setShelf(output);
    }
  };

  return (
    <AppLayout>
      <header>{ModelSelectorElement}</header>
      <StyledOutput>
        <JSONTree theme={theme} hideRoot={true} data={shelf} />
      </StyledOutput>
      <ChatWidget>
        <div>
          <AutoResize data-resize-textarea-content={userMessage}>
            <textarea
              value={userMessage}
              onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit() : null)}
              onChange={(e) => setUserMessage(e.target.value)}
            />
          </AutoResize>
          <output>{status}</output>
        </div>
        <button onClick={handleSubmit}>Submit (Ctrl + Enter)</button>
      </ChatWidget>
    </AppLayout>
  );
};

const AppLayout = styled(CenterClamp)`
  display: grid;
  gap: 1rem;
  width: 100%;
  min-height: 0;
  align-content: start;
  grid-template-rows: auto 1fr auto;
`;

const ChatWidget = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
`;

export const theme = {
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

export const StyledOutput = styled.div`
  width: 100%;
  overflow-y: scroll;
  color-scheme: dark;
  padding: 0 4px;
  background-color: ${theme.base00};

  & > ul {
    margin: 0 !important;
    height: 100%;
  }
`;
