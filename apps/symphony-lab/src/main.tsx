import { render } from "preact";
import { useMemo } from "preact/hooks";
import { useAuth } from "./features/account/use-auth";
import { DuoLoop } from "./features/duo-loop/duo-loop";
import { FrameTreeRoot } from "./features/frame-tree/frame-tree";
import { Notebook } from "./features/notebook/notebook";
import { getChatResponse, type ChatMessage, type OpenAIChatPayload, type OpenAIChatResponse } from "./features/openai/chat";
import "./index.css";

export interface AppContext {
  getChat: (messages: ChatMessage[], config?: Partial<OpenAIChatPayload>) => Promise<OpenAIChatResponse>;
}

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();

  const appContext = useMemo<AppContext>(
    () => ({
      getChat: getChatResponse.bind(null, accessToken),
    }),
    [accessToken]
  );

  return (
    <main>
      {isConnected === undefined ? <>Authenticating...</> : null}
      {isConnected === true ? (
        <>
          <menu>
            <button onClick={signOut}>Sign out</button>
          </menu>
          <details>
            <summary>Notebook demo</summary>
            <Notebook context={appContext} />
          </details>
          <details>
            <summary>Frame tree demo</summary>
            <FrameTreeRoot context={appContext} />
          </details>
          <details>
            <summary>Duo loop demo</summary>
            <DuoLoop context={appContext} />
          </details>
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
