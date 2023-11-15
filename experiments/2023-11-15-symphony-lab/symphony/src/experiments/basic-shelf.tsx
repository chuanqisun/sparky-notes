import { useAuthContext } from "@h20/auth/react-hooks";
import { ChatManager, ChatWorker, getOpenAIWorkerProxy } from "@h20/plex-chat";
import { getTimeoutFunction } from "@h20/plex-chat/src/controller/timeout";
import { LogLevel } from "@h20/plex-chat/src/scheduler/logger";
import type { CozoDb } from "cozo-lib-wasm";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { getH20Proxy } from "../hits/proxy";
import { getSemanticSearchProxy } from "../hits/search-claims";
import type { ChatProxy, FnCallProxy, RawProxy } from "../openai/chat";
import { defaultModelConfig, defaultModels } from "../openai/config";
import { estimateChatTokenDemand } from "../openai/tokens";
import { createAntidoteDirective } from "../shelf/directives/antidote-directive";
import { createCodeDirective } from "../shelf/directives/code-directive";
import { createEachDirective } from "../shelf/directives/each-directive";
import { createExportDirective } from "../shelf/directives/export-directive";
import { createHitsDirective } from "../shelf/directives/hits-directive";
import { createJqDirective } from "../shelf/directives/jq-directive";
import { createJsonDirective } from "../shelf/directives/json-directive";
import { createLensDirective } from "../shelf/directives/lens-directive";
import { createRunDirective } from "../shelf/directives/run-directive";
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
        rpm: 720,
        tpm: 120_000,
        timeout: getTimeoutFunction(3_000, 25),
        contextWindow: 8_192,
      };
    case "gpt-35-turbo-16k":
      return {
        rpm: 522,
        tpm: 87_000,
        timeout: getTimeoutFunction(3_000, 25),
        contextWindow: 16_384,
      };
    case "gpt-4":
      return {
        rpm: 60,
        tpm: 10_000,
        timeout: getTimeoutFunction(5_000, 30),
        contextWindow: 8_192,
      };
    case "gpt-4-32k":
      return {
        rpm: 180,
        tpm: 30_000,
        timeout: getTimeoutFunction(5_000, 30),
        contextWindow: 32_768,
      };
    default:
      throw new Error(`Unknown model id: ${modelId}`);
  }
};

export const BasicShelf: React.FC<BasicShelfProps> = ({ db }) => {
  const auth = useAuthContext();
  const graph = useRef(new Cozo(db));
  useEffect(() => {
    console.log(graph);
  }, [graph]);

  const { allChatEndpoints } = useModelSelector();

  const chatManager = useMemo(() => {
    console.log("endpoints", allChatEndpoints);

    const workers = allChatEndpoints.map((endpoint) => {
      const limits = modelIdToTokenLimit(endpoint.modelDisplayName);
      return new ChatWorker({
        proxy: getOpenAIWorkerProxy({
          apiKey: endpoint.apiKey,
          endpoint: endpoint.endpoint,
        }),
        models: [endpoint.modelDisplayName],
        concurrency: 10,
        timeout: limits.timeout,
        requestsPerMinute: limits.rpm,
        tokensPerMinute: limits.tpm,
        contextWindow: limits.contextWindow,
        logLevel: LogLevel.Warn,
      });
    });

    return new ChatManager({ workers, logLevel: LogLevel.Info });
  }, [allChatEndpoints]);

  const completionCall = useCallback<RawProxy>(
    (messages, modelConfig) => {
      if (!chatManager) throw new Error("No chat manager");

      const { models, ...restConfig } = { models: defaultModels, ...modelConfig };

      const finalInput = {
        ...defaultModelConfig,
        ...restConfig,
        messages,
      };

      return chatManager.submit({
        tokenDemand: estimateChatTokenDemand(finalInput),
        models,
        input: finalInput,
      });
    },
    [chatManager]
  );

  const fnCall = useCallback<FnCallProxy>(
    (messages, modelConfig) => completionCall(messages, modelConfig).then((rawOutput) => rawOutput.choices[0].message.function_call!),
    [completionCall]
  );

  const chat = useCallback<ChatProxy>(
    (messages, modelConfig) => completionCall(messages, modelConfig).then((rawOutput) => rawOutput.choices[0].message.content ?? ""),
    [completionCall]
  );

  const h20Proxy = getH20Proxy(auth.accessToken);
  const semanticSearchProxy = useMemo(() => getSemanticSearchProxy(h20Proxy), [h20Proxy]);

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

  const allDirective = useMemo(
    () => [
      createAntidoteDirective(chat),
      createCodeDirective(fnCall),
      createEachDirective(fnCall, chat),
      createExportDirective(),
      createHitsDirective(semanticSearchProxy),
      createLensDirective(fnCall),
      createJqDirective(chat),
      createJsonDirective(),
      createRunDirective(fnCall),
      createTagDirective(chat),
    ],
    [chat, fnCall]
  );

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
