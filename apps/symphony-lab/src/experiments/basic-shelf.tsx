import { azureOpenAIChatWorker, getChatTaskRunner, getOpenAIJsonProxy, getSimpleRESTChat, type ModelName } from "@h20/chat";
import type { CozoDb } from "cozo-lib-wasm";
import gptTokenizer from "gpt-tokenizer";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { rateLimitQueue, withAsyncQueue } from "../http/rate-limit";
import { createAntidoteDirective } from "../shelf/directives/antidote-directive";
import { createCodeDirective } from "../shelf/directives/code-directive";
import { createExportDirective } from "../shelf/directives/export-directive";
import { createJqDirective } from "../shelf/directives/jq-directive";
import { createJsonDirective } from "../shelf/directives/json-directive";
import { createTagDirective } from "../shelf/directives/tag-directive";
import { StyledOutput, theme } from "../shelf/json-view";
import { useShelfManager } from "../shelf/use-shelf-manager";
import { CenterClamp } from "../shell/center-clamp";

export interface BasicShelfProps {
  db: CozoDb;
}

const modelIdToTokenLimit = (modelId: ModelName) => {
  switch (modelId) {
    case "gpt-35-turbo":
      return {
        tokenLimit: 120_000,
        tokenLimitWindowSize: 65_000,
      };
    case "gpt-35-turbo-16k":
      return {
        tokenLimit: 87_000,
        tokenLimitWindowSize: 65_000,
      };

    case "gpt-4":
      return {
        tokenLimit: 10_000,
        tokenLimitWindowSize: 65_000,
      };
    case "gpt-4-32k":
      return {
        tokenLimit: 30_000,
        tokenLimitWindowSize: 65_000,
      };

    default:
      console.warn(`Unknown modelId: ${modelId}`);
      return {
        tokenLimit: 10_000,
        tokenLimitWindowSize: 65_000,
      };
  }
};

export const BasicShelf: React.FC<BasicShelfProps> = ({ db }) => {
  const graph = useRef(new Cozo(db));
  useEffect(() => {
    console.log(graph);
  }, [graph]);

  const { ModelSelectorElement, allChatEndpoints } = useModelSelector();

  const chatTaskRunner = useMemo(() => {
    console.log("endpoints", allChatEndpoints);

    const workers = allChatEndpoints.map((endpoint) => {
      const q = rateLimitQueue(120);
      const rateLimitedProxy = withAsyncQueue(
        q,
        getOpenAIJsonProxy({
          endpoint: endpoint.endpoint,
          apiKey: endpoint.apiKey,
        })
      );

      const { tokenLimit, tokenLimitWindowSize } = modelIdToTokenLimit(endpoint.modelDisplayName as ModelName);
      const worker = azureOpenAIChatWorker({
        proxy: rateLimitedProxy,
        model: endpoint.modelDisplayName as ModelName,
        parallelism: 50,
        tokenLimit,
        tokenLimitWindowSize,
      });

      return worker;
    });

    const chatTaskRunner = getChatTaskRunner({
      verbose: true,
      workers,
    });

    return chatTaskRunner;
  }, [allChatEndpoints]);

  const chat = useMemo(() => {
    return chatTaskRunner
      ? getSimpleRESTChat({
          chatTaskRunner: chatTaskRunner,
          getTokenCount: (input) => gptTokenizer.encodeChat(input, "gpt-3.5-turbo").length * 1.25, // be conservative
        })
      : () => {
          throw new Error("No chat task runner");
        };
  }, [chatTaskRunner]);

  const { addShelf, openShelf, currentShelf, shelves, userMessage, updateShelfData, updateUserMessage } = useShelfManager();
  const [status, setStatus] = useState("");

  const antidoteDirective = useMemo(() => createAntidoteDirective(chat), [chat]);
  const codeDirective = useMemo(() => createCodeDirective(chat), [chat]);
  const exportDirective = useMemo(() => createExportDirective(), []);
  const jqDirective = useMemo(() => createJqDirective(chat), [chat]);
  const jsonDirective = useMemo(() => createJsonDirective(), []);
  const tagDirective = useMemo(() => createTagDirective(chat), [chat]);

  const allDirective = [antidoteDirective, codeDirective, exportDirective, jqDirective, jsonDirective, tagDirective];

  const handleSubmit = useCallback(async () => {
    setStatus("Running...");

    const matchedDirective = allDirective.find((directive) => directive.match(userMessage));
    if (!matchedDirective) {
      setStatus("No directive matched");
      return;
    }

    addShelf({ source: "", data: [] });

    const { data, status } = await matchedDirective.run({
      source: userMessage,
      data: currentShelf.data,
      updateStatus: setStatus,
      updateData: updateShelfData,
    });

    if (data !== undefined) {
      updateShelfData(data);
    }

    setStatus(status ?? "Success");
  }, [...allDirective, setStatus, updateShelfData]);

  return (
    <AppLayout>
      <header>{ModelSelectorElement}</header>
      <StyledOutput>
        <JSONTree theme={theme} hideRoot={true} data={currentShelf.data} />
      </StyledOutput>
      <div>
        {shelves.map((shelf, index) => (
          <button key={index} onClick={() => openShelf(index)}>
            {shelf === currentShelf ? "*" : ""}
            {index}
          </button>
        ))}
      </div>
      <ChatWidget>
        <div>
          <AutoResize data-resize-textarea-content={userMessage}>
            <textarea
              value={userMessage}
              onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit() : null)}
              onChange={(e) => updateUserMessage(e.target.value)}
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
  width: 100%;
  min-height: 0;
  align-content: start;
  grid-template-rows: auto 1fr auto;
`;

const ChatWidget = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
`;
