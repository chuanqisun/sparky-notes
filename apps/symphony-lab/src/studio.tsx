import "./studio.css";
import { NodeElement } from "./studio/graph/node-element";
import { MenuElement } from "./studio/menu/menu-element";

customElements.define("node-element", NodeElement);
customElements.define("menu-element", MenuElement);

async function main() {
  const menu = document.querySelector<MenuElement>("menu-element")!;

  menu.addEventListener("create-node", (e) => {
    const nodeElement = document.createElement("node-element");
    document.querySelector("main")!.appendChild(nodeElement);
  });
}

main();
