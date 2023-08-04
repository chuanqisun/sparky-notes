import React from "react";
import ReactDOM from "react-dom/client";
import { AuthContextProvider } from "./account/auth-context";
import "./index.css";
import { AppLayout } from "./shell/app";
import { Main } from "./shell/main";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthContextProvider>
      <AppLayout>
        <Main />
      </AppLayout>
    </AuthContextProvider>
  </React.StrictMode>
);
