import { render } from "preact";
import { useMemo } from "preact/hooks";
import { useAuth } from "./features/account/use-auth";
import { getChatResponse, modelToEndpoint, type ChatMessage, type OpenAIChatPayloadWithModel, type OpenAIChatResponse } from "./features/openai/chat";
import "./notebook.css";
import { Notebook } from "./notebook/notebook";

export interface AppContext {
  getChat: (messages: ChatMessage[], config?: Partial<OpenAIChatPayloadWithModel>) => Promise<OpenAIChatResponse>;
}

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();

  const appContext = useMemo<AppContext>(
    () => ({
      getChat: (message, config) => getChatResponse(accessToken, modelToEndpoint(config?.model), message, config),
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
          <Notebook appContext={appContext} />
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
