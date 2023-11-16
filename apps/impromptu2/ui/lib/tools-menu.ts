import { html, render } from "lit-html";
import { Subject, map } from "rxjs";
import type { MessageFromUI } from "../../types/message";
import { $dataAction, filterByAction } from "./data-action";

export function useToolsMenu(props: { container: HTMLElement; $tx: Subject<MessageFromUI> }) {
  render(
    html`
      <button data-action="add-tool" data-tool="chat">Chat</button>
      <button data-action="add-tool" data-tool="conceptSearch">Concept search</button>
    `,
    props.container
  );

  const $addTool = $dataAction(props.container).pipe(
    filterByAction("add-tool"),
    map((e) => e.target.getAttribute("data-tool")!)
  );

  $addTool
    .pipe(
      map((toolName) => ({
        addTool: {
          displayName: toolName,
          blob: JSON.stringify({
            name: toolName,
          }),
        },
      }))
    )
    .subscribe(props.$tx);
}
