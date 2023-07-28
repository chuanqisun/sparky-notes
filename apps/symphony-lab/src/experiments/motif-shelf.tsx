import { ChatManager, ChatWorker, getOpenAIWorkerProxy } from "@h20/plex-chat";
import { getTimeoutFunction } from "@h20/plex-chat/src/controller/timeout";
import { LogLevel } from "@h20/plex-chat/src/scheduler/logger";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useAuthContext } from "../account/auth-context";
import { useModelSelector } from "../account/model-selector";
import { AutoResize } from "../form/auto-resize";
import { getH20Proxy } from "../hits/proxy";
import { getSemanticSearchProxy } from "../hits/search-claims";
import { parseProgram } from "../motif/lang/compiler";
import { run, type Runtime } from "../motif/lang/runtime";
import { hitsSearch } from "../motif/plugins/hits/search";
import { useWorkspace } from "../motif/workspace/use-workspace";
import type { ChatProxy, FnCallProxy, RawProxy } from "../openai/chat";
import { defaultModelConfig, defaultModels } from "../openai/config";
import { estimateChatTokenDemand } from "../openai/tokens";
import { StyledOutput, theme } from "../shelf/json-view";
import { CenterClamp } from "../shell/center-clamp";

export interface MotifShelfProps {}

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

interface Shelf {
  source: string;
  data: any[];
}

export const MotifShelf: React.FC<MotifShelfProps> = () => {
  const { tabs, activeTab, activeState, duplicateActiveTab, openTab, appendTab, replaceState, openPrevState, openNextState, pushState } = useWorkspace<Shelf>({
    source: "",
    data: [],
  });
  const [status, setStatus] = useState("Ready");

  const { accessToken } = useAuthContext();

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

  const h20Proxy = getH20Proxy(accessToken);
  const semanticSearchProxy = useMemo(() => getSemanticSearchProxy(h20Proxy), [h20Proxy]);

  const plugins = useMemo(() => [hitsSearch(fnCall, semanticSearchProxy)], [fnCall, semanticSearchProxy]);

  const handleSubmit = useCallback(
    async (newTab: boolean) => {
      console.log("submitted", activeState.source);

      if (newTab) duplicateActiveTab();

      pushState(() => ({
        source: "",
        data: activeState.data,
      }));

      try {
        const program = parseProgram(activeState.source);
        console.log(program);
        const runtime: Runtime = {
          signal: new AbortController().signal,
          setItems: (...items) => replaceState((prev) => ({ ...prev, data: items })),
          setStatus,
        };

        await run({
          program,
          plugins,
          data: [],
          runtime,
        });
      } catch (e) {
        setStatus(`${(e as any).name}: ${(e as any).message}`);
      }
    },
    [activeState.source, setStatus]
  );

  const handleAbort = useCallback(() => {
    console.log("aborted", Date.now());
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    window.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Q" && e.shiftKey && e.ctrlKey) {
          handleAbort();
          e.preventDefault();
        }
      },
      { signal: abortController.signal }
    );

    return () => abortController.abort();
  }, [handleSubmit, handleAbort]);

  return (
    <AppLayout>
      <div>
        <button onClick={openPrevState}>⬅️</button>
        <button onClick={openNextState}>➡️</button>
        {tabs.map((tab, index) => (
          <button key={index} onClick={() => openTab(index)}>
            {tab === activeTab ? "*" : ""}
            {index}
          </button>
        ))}
        <button onClick={() => appendTab({ source: "", data: [] })}>+</button>
      </div>
      <ChatWidget>
        <div>
          <AutoResize data-resize-textarea-content={activeState.source}>
            <textarea
              value={activeState.source}
              onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit(e.shiftKey) : null)}
              onChange={(e) => replaceState((prev) => ({ ...prev, source: e.target.value }))}
            />
          </AutoResize>
        </div>
      </ChatWidget>
      <StatusDisplay>{status}</StatusDisplay>
      <StyledOutput>
        <JSONTree theme={theme} hideRoot={true} data={activeState.data} />
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
