import React, { useRef } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

function App() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const handleConnectionsButtonClick = () => dialogRef.current?.showModal();

  return (
    <>
      <nav>
        <button onClick={handleConnectionsButtonClick}>Connections</button>
        <dialog ref={dialogRef}>
          <button>Connet to Chat API</button>
          <button>Connect to Embedding API</button>
          <button>Connect to HITS Graph</button>
        </dialog>
      </nav>
      <h1>Vite + React</h1>
    </>
  );
}

export default App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
