import { attachShadowHtml } from "../../utils/custom-element";
import template from "./canvas-element.html?raw";
import type { NodeDraggedEventInit } from "./node-element";

export class CanvasElement extends HTMLElement {
  shadowRoot = attachShadowHtml(template, this);

  connectedCallback() {
    const dragContainer = this.shadowRoot.querySelector<HTMLElement>(".js-drag-container")!;
    this.shadowRoot.addEventListener("node-dragged", (e) => {
      const { x, y, width, height, target } = (e as CustomEvent<NodeDraggedEventInit>).detail;
      target.translate2d(Math.min(Math.max(0, x), dragContainer.scrollWidth - width), Math.min(Math.max(0, y), dragContainer.scrollHeight - height));
    });
  }

  createNode() {
    const nodeElement = document.createElement("node-element");
    this.shadowRoot.getElementById("c-canvas")!.appendChild(nodeElement);
  }
}
