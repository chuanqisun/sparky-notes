import { render } from "preact";
import { useMemo } from "preact/hooks";
import { useAuth } from "./features/account/use-auth";
import { Notebook } from "./features/notebook/notebook";
import { ChatMessage, getChatResponse, OpenAIChatPayload, OpenAIChatResponse } from "./features/openai/chat";
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
          <Notebook context={appContext} />
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
