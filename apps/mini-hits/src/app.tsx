import "./app.css";
import { useAuth } from "./hooks/auth/use-auth";

export function App() {
  const { authState, token, signIn, signOut, prompt } = useAuth();
  console.log(token);

  return (
    <>
      <div class="app-header">
        {authState === "pre-auth" && <p>Loading</p>}
        {authState === "signed-out" && <button onClick={signIn}>Sign in</button>}
        {authState === "signed-in" && <button onClick={signOut}>Sign out</button>}
      </div>
      <div class="auth-form">
        {authState === "signing-in" && prompt && (
          <>
            <input name="deviceCode" type="text" value={prompt!.user_code ?? ""} />
            <button onClick={() => window.open(prompt!.verification_uri)}>Sign in with one-time code</button>
            <button onClick={signIn}>Get new code</button>
          </>
        )}
      </div>
    </>
  );
}
