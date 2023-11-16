import { html } from "lit-html";
import { of } from "rxjs";

export const createConceptSearch = () => {
  return of(html`
    <input type="search" placeholder="Sidebar" /><button>Search</button>
    <div>...</div>
  `);
};
