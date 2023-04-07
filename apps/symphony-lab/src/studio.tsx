import "./studio.css";
import { CanvasElement } from "./studio/graph/canvas-element";
import { NodeElement } from "./studio/graph/node-element";
import { MenuElement } from "./studio/menu/menu-element";

customElements.define("node-element", NodeElement);
customElements.define("canvas-element", CanvasElement);
customElements.define("menu-element", MenuElement);

async function main() {
  const menu = document.querySelector<MenuElement>("menu-element")!;
  const canvas = document.querySelector<CanvasElement>("canvas-element")!;

  menu.addEventListener("create-node", (e) => canvas.createNode());
}

main();
