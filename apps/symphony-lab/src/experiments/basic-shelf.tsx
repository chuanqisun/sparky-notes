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
import type { ChatMessage, OpenAIChatPayload } from "../openai/chat";
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

const modelIdToTokenLimit = (modelId: string) => {
  switch (modelId) {
    case "gpt-35-turbo":
      return 120_000;
    case "gpt-35-turbo-16k":
      return 87_000;
    case "gpt-4":
      return 10_000;
    case "gpt-4-32k":
      return 30_000;
    default:
      throw new Error(`Unknown model id: ${modelId}`);
  }
};

export const BasicShelf: React.FC<BasicShelfProps> = ({ db }) => {
  const graph = useRef(new Cozo(db));
  useEffect(() => {
    console.log(graph);
  }, [graph]);

  const { ModelSelectorElement, allChatEndpoints } = useModelSelector();

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
          tokensPerMinute: modelIdToTokenLimit(endpoint.modelDisplayName),
          logLevel: LogLevel.Error,
        })
    );

    return new ChatManager({ workers, logLevel: LogLevel.Info });
  }, [allChatEndpoints]);

  const chat = useMemo(() => {
    return async (messages: ChatMessage[], modelConfig?: Partial<OpenAIChatPayload>) => {
      if (!chatManager) throw new Error("No chat manager");
      const tokenDemand = gptTokenizer.encodeChat(messages, "gpt-3.5-turbo").length * 1.25; // be conservative
      const controller = new AbortController();

      const rawOutput = await chatManager.submit({
        controller,
        tokenDemand,
        models: ["gpt-35-turbo", "gpt-35-turbo-16k", "gpt-4", "gpt-4-32k"],
        input: {
          temperature: 0,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 60,
          stop: "",
          ...modelConfig,
          messages,
        },
      });

      return rawOutput.choices[0].message.content ?? "";
    };
  }, [chatManager]);

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

  const handleAbort = useCallback(() => {
    chatManager.abortAll();
    setStatus("Stopped by user");
  }, [chatManager]);

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
        <button onClick={handleAbort}>Stop (Ctrl + q)</button>
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
