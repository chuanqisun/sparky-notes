import { html, render } from "lit-html";
import { map, startWith } from "rxjs";
import { $dataAction, filterByAction } from "./data-action";

export function useToolsMenu(props: { container: HTMLElement }) {
  render(
    html`
      <button data-action="add-tool" data-tool="chat">Chat</button>
      <button data-action="add-tool" data-tool="conceptSearch">Concept search</button>
      <button data-action="add-tool" data-tool="noTool">Close</button>
    `,
    props.container
  );

  const $selectedToolName = $dataAction(props.container).pipe(
    filterByAction("add-tool"),
    map((e) => e.target.getAttribute("data-tool")!),
    startWith("noTool")
  );

  return { $selectedToolName };
}
