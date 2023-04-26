import React from "react";
import ReactDOM from "react-dom/client";
import { AccountContextProvider } from "./account/account-context";
import { ConnectionSetupDialog } from "./account/connection-setup-form";
import "./index.css";
import { useDialog } from "./utils/use-dialog";

function App() {
  const { DialogComponent, open, close } = useDialog();
  const handleConnectionsButtonClick = () => open();

  return (
    <>
      <nav>
        <button onClick={handleConnectionsButtonClick}>Connections</button>
        <DialogComponent>
          <ConnectionSetupDialog onClose={close} />
        </DialogComponent>
      </nav>
    </>
  );
}

export default App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AccountContextProvider>
      <App />
    </AccountContextProvider>
  </React.StrictMode>
);
