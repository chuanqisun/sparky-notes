import { render } from "preact";
import { useEffect } from "preact/hooks";
import "./main.css";
import { updateRuntime } from "./modules/updater/update-runtime";

function App() {
  useEffect(() => {
    updateRuntime();
  }, []);

  return (
    <main>
      <button onClick={updateRuntime}>Update widget</button>
    </main>
  );
}

document.getElementById("app")!.innerHTML = "";
render(<App />, document.getElementById("app") as HTMLElement);
