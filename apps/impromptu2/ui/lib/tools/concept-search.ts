import { html } from "lit-html";
import { of, type Subject } from "rxjs";
import type { MessageFromUI } from "../../../types/message";

export const createConceptSearch = () => (props: { id: string; parsedBlob: any; $tx: Subject<MessageFromUI> }) => {
  return of(html`
    <input type="search" placeholder="Sidebar" /><button>Search</button>
    <div>${JSON.stringify(props.parsedBlob)}</div>
  `);
};
