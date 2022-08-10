import { useState } from "preact/hooks";
import "./app.css";
import { useAuth } from "./hooks/auth/use-auth";
import { sendToMain } from "./hooks/ipc/ipc-utils";
import { useSearch } from "./hooks/search/use-search";

export function App() {
  const { authState, token, signIn, signOut, prompt } = useAuth();

  const [searchPhrase, setSearchPhrase] = useState("");
  const { searchData, searchError, searchLoading } = useSearch({ searchPhrase, token: token?.access_token });

  return (
    <>
      <header class="app-header">
        {authState === "pre-auth" && <p>Loading</p>}
        {authState === "signed-out" && <button onClick={signIn}>Sign in</button>}
        {authState === "signed-in" && (
          <>
            <input name="search" placeholder="Search" type="search" onInput={(e) => setSearchPhrase((e.target as HTMLInputElement).value)} />
            <button onClick={signOut}>Sign out</button>
          </>
        )}
      </header>
      <div class="auth-form">
        {authState === "signing-in" && prompt && (
          <>
            <input name="deviceCode" type="text" value={prompt!.user_code ?? ""} />
            <button onClick={() => window.open(prompt!.verification_uri)}>Sign in with one-time code</button>
            <button onClick={signIn}>Get new code</button>
          </>
        )}
      </div>
      <div class="search-results">
        {searchLoading && <p>Searching...</p>}
        {searchError && <p>Something went wrong.</p>}
        {searchData &&
          searchData.search.organicResults.map((result) => (
            <article key={result.id}>
              <div>{result.entityType}</div>
              <div>{result.title}</div>
              <ul>
                {result.children.map((child) => (
                  <li key={child.id}>
                    <div>
                      {child.entityType} - {child.title}
                    </div>
                    <button onClick={() => sendToMain({ type: "selectItem", ...child })}>Add to canvas</button>
                  </li>
                ))}
              </ul>
            </article>
          ))}
      </div>
    </>
  );
}
