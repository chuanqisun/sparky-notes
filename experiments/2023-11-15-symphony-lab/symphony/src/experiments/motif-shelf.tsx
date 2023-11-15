import { useAuthContext } from "@h20/auth/react-hooks";
import { ChatManager, ChatWorker, getOpenAIWorkerProxy } from "@h20/plex-chat";
import { getTimeoutFunction } from "@h20/plex-chat/src/controller/timeout";
import { LogLevel } from "@h20/plex-chat/src/scheduler/logger";
import CodeMirror from "@uiw/react-codemirror";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { getH20Proxy } from "../hits/proxy";
import { getSemanticSearchProxy } from "../hits/search-claims";
import { motif } from "../motif/codemirror";
import { parseProgram } from "../motif/lang/compiler";
import { run, type Runtime } from "../motif/lang/runtime";
import { coreCodePlugin } from "../motif/plugins/core/code";
import { coreEachPlugin } from "../motif/plugins/core/each";
import { coreFilterPlugin } from "../motif/plugins/core/filter";
import { coreInferPlugin } from "../motif/plugins/core/infer";
import { coreInferManyPlugin } from "../motif/plugins/core/inferMany";
import { coreDeleteShelfPlugin, coreRenameShelfPlugin } from "../motif/plugins/core/shelf";
import { coreSummarizePlugin } from "../motif/plugins/core/summarize";
import { fileImportPlugin } from "../motif/plugins/file/import";
import { hitsSearchPlugin } from "../motif/plugins/hits/search";
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
  title: string;
  source: string;
  data: any[];
}

export const MotifShelf: React.FC<MotifShelfProps> = () => {
  const {
    tabs,
    activeTab,
    activeState,
    hasPrevState,
    hasNextState,
    duplicateActiveTab,
    openTab,
    appendTab,
    deleteActiveTab,
    replaceState,
    openPrevState,
    openNextState,
    pushState,
  } = useWorkspace<Shelf>({
    title: "New shelf",
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

  const plugins = useMemo(
    () => [
      coreCodePlugin(fnCall),
      coreEachPlugin(fnCall),
      coreFilterPlugin(fnCall),
      coreInferPlugin(fnCall),
      coreInferManyPlugin(fnCall),
      coreRenameShelfPlugin(),
      coreDeleteShelfPlugin(),
      coreSummarizePlugin(fnCall),
      fileImportPlugin(),
      hitsSearchPlugin(fnCall, semanticSearchProxy),
    ],
    [fnCall, semanticSearchProxy]
  );

  const runtimeCompletions = useMemo(() => {
    return plugins.map((plugin) => ({
      label: plugin.operator,
      info: plugin.description,
      type: "function",
    }));
  }, [plugins]);

  const handleSubmit = useCallback(
    async (newTab: boolean) => {
      console.log("submitted", activeState.source);

      if (newTab) duplicateActiveTab();
      if (!activeState.source) return;

      pushState((prev) => ({
        title: prev.title,
        source: "",
        data: activeState.data,
      }));

      try {
        const program = parseProgram(activeState.source);
        console.log(program);

        const runtime: Runtime = {
          signal: new AbortController().signal,
          setShelfName: (name) => replaceState((prev) => ({ ...prev, title: name })),
          getShelfName: () => activeState.title,
          deleteShelf: () => deleteActiveTab(),
          setItems: (items) => replaceState((prev) => ({ ...prev, data: items })),
          setStatus,
        };

        await run({
          program,
          plugins,
          data: activeState.data,
          runtime,
        });
      } catch (e) {
        setStatus(`${(e as any).name}: ${(e as any).message}`);
      }
    },
    [activeState.source, setStatus]
  );

  const handleAbort = useCallback(() => {
    setStatus(`Aborted ${Date.now()}`);
    console.log("aborted", Date.now());
  }, [setStatus]);

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
        <button onClick={openPrevState} disabled={!hasPrevState}>
          ⬅️
        </button>
        <button onClick={openNextState} disabled={!hasNextState}>
          ➡️
        </button>
        {tabs.map((tab, index) => (
          <button key={index} onClick={() => openTab(index)}>
            {tab === activeTab ? "*" : ""}
            {tab.states[tab.activeStateIndex].title}
          </button>
        ))}
        <button onClick={() => appendTab({ title: "New shelf", source: "", data: [] })}>+</button>
      </div>
      <ChatWidget>
        <div>
          <CodeMirror
            value={activeState.source}
            style={{ display: "grid" }}
            basicSetup={{ lineNumbers: false, autocompletion: true, foldGutter: false, bracketMatching: false, closeBrackets: false }}
            extensions={[
              motif({
                runtimeCompletions,
              }),
            ]}
            onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit(e.shiftKey) : null)}
            maxHeight="200px"
            minHeight="80px"
            onChange={(e) => replaceState((prev) => ({ ...prev, source: e }))}
          />
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
