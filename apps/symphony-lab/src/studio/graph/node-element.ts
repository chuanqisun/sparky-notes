import { attachShadowHtml } from "../../utils/custom-element";
import template from "./node-element.html?raw";

declare global {
  interface GlobalEventHandlersEventMap {
    "node-dragged": CustomEvent<NodeDraggedEventInit>;
  }
}

export interface NodeDraggedEventInit {
  target: NodeElement;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class NodeElement extends HTMLElement {
  shadowRoot = attachShadowHtml(template, this);
  private dragBar = this.shadowRoot.querySelector<HTMLElement>(".js-drag")!;
  private currentTransform: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
  private pointerStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private elementOrigin: { x: number; y: number } = { x: 0, y: 0 };

  connectedCallback() {
    this.elementOrigin = { x: this.getBoundingClientRect().x, y: this.getBoundingClientRect().y };

    const handleMousemove = (e: Event) => {
      this.dispatchEvent(
        new CustomEvent<NodeDraggedEventInit>("node-dragged", {
          detail: {
            target: this,
            x: (e as MouseEvent).x - this.pointerStartPosition.x + this.currentTransform.x,
            y: (e as MouseEvent).y - this.pointerStartPosition.y + this.currentTransform.y,
            width: this.currentTransform.width,
            height: this.currentTransform.height,
          },
          bubbles: true,
        })
      );
    };

    this.dragBar.addEventListener("pointerdown", (e) => {
      const rect = this.getBoundingClientRect();
      this.currentTransform = { x: rect.x - this.elementOrigin.x, y: rect.y - this.elementOrigin.y, width: rect.width, height: rect.height };
      this.pointerStartPosition = { x: e.x, y: e.y };
      window.addEventListener("pointermove", handleMousemove);
    });

    this.dragBar.addEventListener("pointerup", (e) => {
      window.removeEventListener("pointermove", handleMousemove);
    });
  }

  translate2d(x: number, y: number) {
    this.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}
