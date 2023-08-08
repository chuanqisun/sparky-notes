import { getProxyToFigma } from "@h20/figma-relay";
import { motif, parse, run, type Runtime } from "@h20/motif-lang";
import type { MessageToFigma, MessageToWeb } from "@impromptu/types";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JSONTree } from "react-json-tree";
import { styled } from "styled-components";
import { useAuthContext } from "../account/use-auth-context";
import { getH20Proxy } from "../h20/proxy";
import { getSemanticSearchProxy } from "../hits/search-claims";
import { coreCodePlugin } from "../motif/plugins/code";
import { coreEachPlugin } from "../motif/plugins/each";
import { coreFilterPlugin } from "../motif/plugins/filter";
import { fileImportPlugin } from "../motif/plugins/import";
import { coreInferPlugin } from "../motif/plugins/infer";
import { coreInferManyPlugin } from "../motif/plugins/inferMany";
import { hitsSearchPlugin } from "../motif/plugins/search";
import { coreDeleteShelfPlugin, coreRenameShelfPlugin } from "../motif/plugins/shelf";
import { coreSummarizePlugin } from "../motif/plugins/summarize";
import { getChatProxy, getFnCallProxy } from "../openai/proxy";
import { coerceArray } from "../utils/array";
import { theme } from "./theme";

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected, signOut, signIn, accessToken } = useAuthContext();
  const proxy = useMemo(() => getProxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID), []);

  const { fnCallProxy, semanticSearchProxy } = useMemo(() => {
    const h20Proxy = getH20Proxy(accessToken);

    return {
      chatProxy: getChatProxy(h20Proxy),
      fnCallProxy: getFnCallProxy(h20Proxy),
      semanticSearchProxy: getSemanticSearchProxy(h20Proxy),
    };
  }, [accessToken]);

  const plugins = useMemo(
    () => [
      coreCodePlugin(fnCallProxy),
      coreEachPlugin(fnCallProxy),
      coreFilterPlugin(fnCallProxy),
      coreInferPlugin(fnCallProxy),
      coreInferManyPlugin(fnCallProxy),
      coreRenameShelfPlugin(),
      coreDeleteShelfPlugin(),
      coreSummarizePlugin(fnCallProxy),
      fileImportPlugin(),
      hitsSearchPlugin(fnCallProxy, semanticSearchProxy),
    ],
    [fnCallProxy, semanticSearchProxy]
  );

  const runtimeCompletions = useMemo(() => {
    return plugins.map((plugin) => ({
      label: plugin.operator,
      info: plugin.description,
      type: "function",
    }));
  }, [plugins]);

  // code editor
  const [editorState, setEditorState] = useState({ source: "", selectedData: [] as any[] });

  const handleSubmit = useCallback(
    async (shiftKey: boolean) => {
      const res = await proxy.request({ createStepReq: { source: editorState.source, shiftKey } });
      console.log(res.createStepRes);
      setEditorState((prev) => ({ ...prev, source: "" }));

      try {
        const program = parse(editorState.source);
        console.log(program);

        const runtime: Runtime = {
          signal: new AbortController().signal,
          setShelfName: (name) => proxy.notify({ showNotification: { message: `Renaming shelf to ${name}` } }),
          getShelfName: () => "TBD",
          deleteShelf: () => "TBD",
          setItems: (items) => {
            proxy.notify({
              addStickies: {
                parentId: res.createStepRes!,
                items: items.map((item, index) => ({
                  text: `Item ${index + 1}`,
                  data: item,
                })),
              },
            }),
              proxy.notify({ showNotification: { message: `Setting ${items.length} items` } });
          },
          setStatus: (status) => proxy.notify({ showNotification: { message: status } }),
        };

        await run({
          program,
          plugins,
          data: coerceArray(editorState.selectedData) ?? [],
          runtime,
        });
      } catch (e) {
        proxy.notify({ showNotification: { message: (e as any).message, config: { error: true } } });
      }
    },
    [editorState, plugins, proxy]
  );

  // message handlers
  useEffect(() => {
    const handleMessageToWeb = async (e: MessageEvent) => {
      const message = e.data.pluginMessage as MessageToWeb;

      if (message.selectionChanged) {
        setEditorState((prev) => ({ ...prev, selectedData: JSON.parse(message.selectionChanged?.data ?? "[]") }));
      }
    };

    window.addEventListener("message", handleMessageToWeb);
    return () => window.removeEventListener("message", handleMessageToWeb);
  }, []);

  return (
    <StyledMain>
      {isConnected ? (
        <fieldset>
          <legend>Builder</legend>
          <CodeMirror
            value={editorState.source}
            style={{ display: "grid" }}
            basicSetup={{ lineNumbers: false, autocompletion: true, foldGutter: false, bracketMatching: false, closeBrackets: false }}
            extensions={[motif({ runtimeCompletions })]}
            onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit(e.shiftKey) : null)}
            maxHeight="200px"
            minHeight="80px"
            onChange={(e) => setEditorState((prev) => ({ ...prev, source: e }))}
          />
          <button onClick={() => handleSubmit(false)}>Continue</button>
          <button onClick={() => handleSubmit(false)}>Re-run</button>
        </fieldset>
      ) : null}
      {isConnected ? (
        <fieldset>
          <legend>Inspector</legend>
          <StyledOutput>
            <JSONTree theme={theme} hideRoot={true} data={coerceArray(editorState.selectedData)} />
          </StyledOutput>
        </fieldset>
      ) : null}
      <fieldset>
        <legend>Account</legend>
        {isConnected === undefined ? <p>Authenticating...</p> : null}
        {isConnected === true ? props.children : null}
        {isConnected === false ? <button onClick={signIn}>Sign in</button> : null}
        {isConnected === true && <button onClick={signOut}>Sign out</button>}
      </fieldset>
    </StyledMain>
  );
};

const StyledMain = styled.main``;

const StyledOutput = styled.div`
  width: 100%;
  max-height: 60vh;
  overflow-y: scroll;
  color-scheme: dark;
  padding: 0 4px;
  background-color: ${theme.base00};

  & > ul {
    margin: 0 !important;
    height: 100%;
  }
`;
