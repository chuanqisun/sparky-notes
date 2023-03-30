import { render } from "preact";
import { useCallback, useEffect, useMemo, useRef } from "preact/hooks";
import { useAuth } from "./features/account/use-auth";
import { EditorElement, TreeNode } from "./features/editor/editor-element";
import { getCompletion } from "./features/openai/completion";
import "./index.css";

// ref: https://coryrylan.com/blog/how-to-use-web-components-in-preact-and-typescript
declare global {
  namespace preact.createElement.JSX {
    interface IntrinsicElements {
      ["editor-element"]: Partial<EditorElement> & HTMLAttributes<HTMLElement>;
    }
  }
}
customElements.define("editor-element", EditorElement);

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();
  const complete = useMemo(() => getCompletion.bind(null, accessToken), [accessToken]);

  const editorRef = useRef<EditorElement>(null);

  const handleSubmit = useCallback(
    (event: CustomEvent) => {
      const newNodeId = crypto.randomUUID();
      editorRef.current?.appendTreeNode({ id: newNodeId, text: "…", classList: ["c-editor__node--response"] });
      const submittedNode: TreeNode = event.detail;
      complete(submittedNode.text)
        .then((res) => res.choices[0].text.trim())
        .then((text) => {
          editorRef.current?.replaceTreeNodeText(newNodeId, text.length ? text : "No response");
        })
        .catch((err: any) => editorRef.current?.replaceTreeNodeText(newNodeId, `${err.name}: ${err.message}`));
    },
    [complete]
  );

  useEffect(() => {
    editorRef.current?.addEventListener("execute", handleSubmit as EventListener);
    return () => editorRef.current?.removeEventListener("execute", handleSubmit as EventListener);
  }, [handleSubmit]);

  return (
    <main>
      {isConnected === undefined ? <>Authenticating...</> : null}
      {isConnected === true ? (
        <>
          <menu>
            <button onClick={signOut}>Sign out</button>
          </menu>
          <editor-element ref={editorRef} />
        </>
      ) : null}
      {isConnected === false ? (
        <menu>
          <button onClick={signIn}>Sign in</button>
        </menu>
      ) : null}
    </main>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
