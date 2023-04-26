import React from "react";
import ReactDOM from "react-dom/client";
import { AccountContextProvider } from "./account/account-context";
import "./index.css";
import { Main } from "./shell/main";
import { Nav } from "./shell/nav";

function App() {
  return (
    <>
      <Nav />
      <Main></Main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AccountContextProvider>
      <App />
    </AccountContextProvider>
  </React.StrictMode>
);
