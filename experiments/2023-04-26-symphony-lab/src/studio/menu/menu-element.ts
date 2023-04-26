import { attachShadowHtml } from "../../utils/custom-element";
import template from "./menu-element.html?raw";

declare global {
  interface GlobalEventHandlersEventMap {
    "create-node": CustomEvent<CreateNodeEventInit>;
  }
}

export interface CreateNodeEventInit {
  type: string;
}

export class MenuElement extends HTMLElement {
  shadowRoot = attachShadowHtml(template, this);

  connectedCallback() {
    this.shadowRoot.addEventListener("click", (e) => {
      const actionName = (e.target as HTMLElement).closest?.("[data-action]")?.getAttribute("data-action");
      switch (actionName) {
        case "create-node":
          this.dispatchEvent(new CustomEvent<CreateNodeEventInit>("create-node", { detail: { type: "" } }));
      }
    });
  }
}
