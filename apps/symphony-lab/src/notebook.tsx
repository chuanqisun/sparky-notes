import { render } from "preact";
import { useMemo } from "preact/hooks";
import { useAuth } from "./features/account/use-auth";
import { getSearchProxy, type SearchProxy } from "./features/hits/proxy";
import { getChatResponse, modelToEndpoint, type ChatMessage, type OpenAIChatPayloadWithModel, type OpenAIChatResponse } from "./features/openai/chat";
import "./notebook.css";
import { Notebook } from "./notebook/notebook";

export interface NotebookAppContext {
  getChat: (messages: ChatMessage[], config?: Partial<OpenAIChatPayloadWithModel>) => Promise<OpenAIChatResponse>;
  searchProxy: SearchProxy;
}

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();

  const appContext = useMemo<NotebookAppContext>(
    () => ({
      getChat: (message, config) => getChatResponse(accessToken, modelToEndpoint(config?.model), message, config),
      searchProxy: getSearchProxy(accessToken),
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
