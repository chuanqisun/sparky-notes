import { proxyToFigma } from "@h20/figma-relay";
import { motif, parse, run, type Runtime } from "@h20/motif-lang";
import type { MessageToFigma, MessageToWeb } from "@impromptu/types";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useMemo, useState } from "react";
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

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected, signOut, signIn, accessToken } = useAuthContext();
  const figmaProxy = useMemo(() => proxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID), []);

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
  const [editorState, setEditorState] = useState({ source: "" });

  const handleSubmit = useCallback(
    async (shiftKey: boolean) => {
      figmaProxy.notify({ createStep: { source: editorState.source, shiftKey } });
      setEditorState((prev) => ({ ...prev, source: "" }));

      try {
        const program = parse(editorState.source);
        console.log(program);

        const runtime: Runtime = {
          signal: new AbortController().signal,
          setShelfName: (name) => figmaProxy.notify({ showNotification: { message: `Renaming shelf to ${name}` } }),
          getShelfName: () => "TBD",
          deleteShelf: () => "TBD",
          setItems: (items) => figmaProxy.notify({ showNotification: { message: `Setting ${items.length} items` } }),
          setStatus: (status) => figmaProxy.notify({ showNotification: { message: status } }),
        };

        await run({
          program,
          plugins,
          data: [], // TODO load data
          runtime,
        });
      } catch (e) {
        figmaProxy.notify({ showNotification: { message: (e as any).message, config: { error: true } } });
      }
    },
    [editorState, plugins, figmaProxy]
  );

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
          <button onClick={() => figmaProxy.notify({ createStep: {} })}>Submit</button>
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
