import { attachShadowHtml } from "../../utils/custom-element";
import template from "./inspector-element.html?raw";

export class InspectorElement extends HTMLElement {
  shadowRoot = attachShadowHtml(template, this);
}
