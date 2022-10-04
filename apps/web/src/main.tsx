import { render } from "preact";
import { App } from "./app";

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";

render(<App />, document.getElementById("app") as HTMLElement);

window.focus();
