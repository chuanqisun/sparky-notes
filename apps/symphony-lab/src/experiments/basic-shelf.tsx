import { ChatManager, ChatWorker, getOpenAIJsonProxy } from "@h20/plex-chat";
import { LogLevel } from "@h20/plex-chat/src/scheduler/logger";
import type { CozoDb } from "cozo-lib-wasm";
import gptTokenizer from "gpt-tokenizer";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import type { ChatMessage, FnCallProxy, SimpleModelConfig } from "../openai/chat";
import { createAntidoteDirective } from "../shelf/directives/antidote-directive";
import { createCodeDirective } from "../shelf/directives/code-directive";
import { createExportDirective } from "../shelf/directives/export-directive";
import { createJqDirective } from "../shelf/directives/jq-directive";
import { createJsonDirective } from "../shelf/directives/json-directive";
import { createLensDirective } from "../shelf/directives/lens-directive";
import { createTagDirective } from "../shelf/directives/tag-directive";
import { StyledOutput, theme } from "../shelf/json-view";
import { useShelfManager } from "../shelf/use-shelf-manager";
import { CenterClamp } from "../shell/center-clamp";

export interface BasicShelfProps {
  db: CozoDb;
}

const modelIdToTokenLimit = (modelId: string) => {
  switch (modelId) {
    case "gpt-35-turbo":
      return {
        tpm: 120_000,
        contextWindow: 8_192,
      };
    case "gpt-35-turbo-16k":
      return {
        tpm: 87_000,
        contextWindow: 16_384,
      };
    case "gpt-4":
      return {
        tpm: 10_000,
        contextWindow: 8_192,
      };
    case "gpt-4-32k":
      return {
        tpm: 30_000,
        contextWindow: 32_768,
      };
    default:
      throw new Error(`Unknown model id: ${modelId}`);
  }
};

export const BasicShelf: React.FC<BasicShelfProps> = ({ db }) => {
  const graph = useRef(new Cozo(db));
  useEffect(() => {
    console.log(graph);
  }, [graph]);

  const { allChatEndpoints } = useModelSelector();

  const chatManager = useMemo(() => {
    console.log("endpoints", allChatEndpoints);

    const workers = allChatEndpoints.map(
      (endpoint) =>
        new ChatWorker({
          proxy: getOpenAIJsonProxy({
            apiKey: endpoint.apiKey,
            endpoint: endpoint.endpoint,
          }),
          models: [endpoint.modelDisplayName],
          concurrency: 10,
          tokensPerMinute: modelIdToTokenLimit(endpoint.modelDisplayName).tpm,
          contextWindow: modelIdToTokenLimit(endpoint.modelDisplayName).contextWindow,
          logLevel: LogLevel.Warn,
        })
    );

    return new ChatManager({ workers, logLevel: LogLevel.Info });
  }, [allChatEndpoints]);

  const fnCall: FnCallProxy = useMemo(() => {
    return async (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => {
      if (!chatManager) throw new Error("No chat manager");
      const inputDemand =
        gptTokenizer.encodeChat(messages, "gpt-3.5-turbo").length * 1.25 + gptTokenizer.encode(JSON.stringify(modelConfig?.function_call)).length;
      const controller = new AbortController();

      const { models, ...restConfig } = modelConfig ?? {};

      const rawOutput = await chatManager.submit({
        controller,
        tokenDemand: inputDemand + (modelConfig?.max_tokens ?? 60),
        models: models ?? ["gpt-35-turbo", "gpt-35-turbo-16k", "gpt-4", "gpt-4-32k"],
        input: {
          temperature: 0,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 60,
          stop: "",
          ...restConfig,
          messages,
        },
      });

      return rawOutput.choices[0].message.function_call!;
    };
  }, [chatManager]);

  const chat = useMemo(() => {
    return async (messages: ChatMessage[], modelConfig?: SimpleModelConfig) => {
      if (!chatManager) throw new Error("No chat manager");
      const inputDemand = gptTokenizer.encodeChat(messages, "gpt-3.5-turbo").length * 1.25; // be conservative
      const controller = new AbortController();

      const { models, ...restConfig } = modelConfig ?? {};

      const rawOutput = await chatManager.submit({
        controller,
        tokenDemand: inputDemand + (modelConfig?.max_tokens ?? 60),
        models: models ?? ["gpt-35-turbo", "gpt-35-turbo-16k", "gpt-4", "gpt-4-32k"],
        input: {
          temperature: 0,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 60,
          stop: "",
          ...restConfig,
          messages,
        },
      });

      return rawOutput.choices[0].message.content ?? "";
    };
  }, [chatManager]);

  const { addShelf, openShelf, currentShelf, shelves, userMessage, updateShelfData, updateUserMessage } = useShelfManager();
  const [status, setStatus] = useState("");
  const setTimestampedStatus = useCallback(
    (message: string) => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, "0");
      setStatus(`${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${message}`);
    },
    [setStatus]
  );

  useEffect(() => {
    setTimestampedStatus("System online");
  }, []);

  const antidoteDirective = useMemo(() => createAntidoteDirective(chat), [chat]);
  const codeDirective = useMemo(() => createCodeDirective(fnCall), [fnCall]);
  const exportDirective = useMemo(() => createExportDirective(), []);
  const lensDirective = useMemo(() => createLensDirective(fnCall), [fnCall]);
  const jqDirective = useMemo(() => createJqDirective(chat), [chat]);
  const jsonDirective = useMemo(() => createJsonDirective(), []);
  const tagDirective = useMemo(() => createTagDirective(chat), [chat]);

  const allDirective = [antidoteDirective, codeDirective, exportDirective, lensDirective, jqDirective, jsonDirective, tagDirective];

  const handleSubmit = useCallback(async () => {
    setTimestampedStatus("Running...");

    const matchedDirective = allDirective.find((directive) => directive.match(userMessage));
    if (!matchedDirective) {
      setTimestampedStatus("No directive matched");
      return;
    }

    addShelf({ source: "", data: [] });

    const { data, status } = await matchedDirective.run({
      source: userMessage,
      data: currentShelf.data,
      updateStatus: setTimestampedStatus,
      updateData: updateShelfData,
    });

    if (data !== undefined) {
      updateShelfData(data);
    }

    setTimestampedStatus(status ?? "Success");
  }, [...allDirective, setTimestampedStatus, updateShelfData]);

  const handleAbort = useCallback(() => {
    chatManager.abortAll();
    setTimestampedStatus("Stopped by user");
  }, [chatManager]);

  return (
    <AppLayout>
      <ChatWidget>
        <div>
          <AutoResize data-resize-textarea-content={userMessage}>
            <textarea
              value={userMessage}
              onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit() : null)}
              onChange={(e) => updateUserMessage(e.target.value)}
            />
          </AutoResize>
        </div>
        <ButtonStack>
          <button onClick={handleSubmit}>▶️</button>
          <button onClick={handleAbort}>⛔</button>
        </ButtonStack>
      </ChatWidget>
      <div>
        {shelves.map((shelf, index) => (
          <button key={index} onClick={() => openShelf(index)}>
            {shelf === currentShelf ? "*" : ""}
            {index}
          </button>
        ))}
      </div>
      <StatusDisplay>{status}</StatusDisplay>
      <StyledOutput>
        <JSONTree theme={theme} hideRoot={true} data={currentShelf.data} />
      </StyledOutput>
    </AppLayout>
  );
};

const StatusDisplay = styled.output`
  display: block;
  background-color: ${theme.base00};
  padding-left: 0.5rem;
  color: ${theme.base09};
  border-bottom: 1px solid ${theme.base03};
`;

const AppLayout = styled(CenterClamp)`
  display: grid;
  width: 100%;
  min-height: 0;
  align-content: start;
  grid-template-rows: auto auto auto 1fr;
`;

const ChatWidget = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
`;

const ButtonStack = styled.div`
  display: grid;
`;
