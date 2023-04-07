import { attachShadowHtml } from "../../utils/custom-element";
import template from "./node-element.html?raw";
export class NodeElement extends HTMLElement {
  shadowRoot = attachShadowHtml(template, this);
}
