import { render } from "preact";
import { App } from "./app";
import Worker from "./worker?worker";

// remove loading placeholder
document.getElementById("app")!.innerHTML = "";

const worker = new Worker();

render(<App worker={worker} />, document.getElementById("app") as HTMLElement);

window.focus();
