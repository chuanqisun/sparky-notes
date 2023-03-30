import { render } from "preact";
import { useAuth } from "./features/account/use-auth";
import "./index.css";

function App() {
  const { isConnected, signIn, signOut, accessToken } = useAuth();
  return (
    <>
      {isConnected === undefined ? <>Authenticating...</> : null}
      {isConnected === true ? (
        <div>
          <button onClick={signOut}>Sign out</button>
        </div>
      ) : null}
      {isConnected === false ? (
        <div>
          <button onClick={signIn}>Sign in</button>
        </div>
      ) : null}
    </>
  );
}

render(<App />, document.getElementById("app") as HTMLElement);
