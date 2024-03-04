import { html } from "lit-html";
import { of } from "rxjs";

export const createNoTool = () => {
  return of(html`<div>No tool selected</div>`);
};
