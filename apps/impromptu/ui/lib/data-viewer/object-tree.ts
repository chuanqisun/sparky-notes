import { html, type TemplateResult } from "lit-html";
import "./object-tree.css";

/** Render array as a list of <details><summary/><details/>, render object and <dl><dt><dd> */
export interface ObjectTreeProps {
  data?: any;
}

export function renderObjectTree(props: ObjectTreeProps) {
  return html` <div class="c-object-viewer">${renderObjectTreeNode({ data: props.data, level: 0 })}</div> `;
}

function renderObjectTreeNode({ data, level }: any): TemplateResult {
  if (typeof data !== "object") return html`<span>${data.toString()}</span>`;
  if (data === null) return html`<span>null</span>`;

  return html`
    ${Object.entries(data).map(([key, value], index) =>
      isPrimitive(value)
        ? html`<div key="${index}"><span class="c-object-viewer__key">${key}</span>: <span class="c-object-viewer__value">${value as any}</span></div>`
        : html`<details data-level="${level}" key="${index}" open=${level < 2}>
            <summary>${key}</summary>
            <div class="c-object-viewer__details">${renderObjectTreeNode({ data: value, level: level + 1 })}</div>
          </details>`
    )}
  `;
}

function isPrimitive(data: any) {
  return typeof data !== "object" || data === null;
}
