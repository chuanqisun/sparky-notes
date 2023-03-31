import { render } from "preact";
import { useMemo } from "preact/hooks";
import { useAuth } from "./features/account/use-auth";
import { Notebook } from "./features/notebook/notebook";
import { getChatResponse } from "./features/openai/chat";
import "./index.css";

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();
  const chat = useMemo(() => getChatResponse.bind(null, accessToken), [accessToken]);

  return (
    <main>
      {isConnected === undefined ? <>Authenticating...</> : null}
      {isConnected === true ? (
        <>
          <menu>
            <button onClick={signOut}>Sign out</button>
          </menu>
          <Notebook chat={chat} />
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
