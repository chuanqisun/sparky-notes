import { attachShadowHtml } from "../../utils/custom-element";
import template from "./canvas-element.html?raw";

export class CanvasElement extends HTMLElement {
  shadowRoot = attachShadowHtml(template, this);

  createNode() {
    const nodeElement = document.createElement("node-element");
    this.shadowRoot.getElementById("c-canvas")!.appendChild(nodeElement);
  }
}
