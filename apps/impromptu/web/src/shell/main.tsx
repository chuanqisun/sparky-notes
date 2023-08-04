import { proxyToFigma } from "@h20/figma-relay";
import { MessageToFigma, MessageToWeb } from "@impromptu/types";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useMemo, useState } from "react";
import { styled } from "styled-components";
import { useAuthContext } from "../account/use-auth-context";

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected, signOut, signIn } = useAuthContext();
  const proxy = useMemo(() => proxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID), []);

  // code editor
  const [editorState, setEditorState] = useState({ source: "" });

  const handleSubmit = useCallback(
    (shiftKey: boolean) => {
      proxy.notify({ createStep: { source: editorState.source, shiftKey } });
      setEditorState((prev) => ({ ...prev, source: "" }));
    },
    [proxy]
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
            extensions={[]}
            onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit(e.shiftKey) : null)}
            maxHeight="200px"
            minHeight="80px"
            onChange={(e) => setEditorState((prev) => ({ ...prev, source: e }))}
          />
          <button onClick={() => proxy.notify({ createStep: {} })}>Submit</button>
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
