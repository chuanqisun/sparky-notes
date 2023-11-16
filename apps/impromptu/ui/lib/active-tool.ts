import { render, type TemplateResult } from "lit-html";
import { distinctUntilChanged, map, Observable, Subject, switchMap, tap } from "rxjs";
import type { MessageFromUI } from "../../types/message";

export interface ToolInput {
  $tx: Subject<MessageFromUI>;
}
export type Tool = (props: ToolInput) => Observable<TemplateResult>;

export function useActiveTool(config: {
  $selectedToolName: Observable<string>;
  $tx: Subject<MessageFromUI>;
  tools: Record<string, Tool>;
  container: HTMLElement;
}) {
  const { $selectedToolName, $tx, container, tools } = config;
  const $activeTool = $selectedToolName.pipe(
    distinctUntilChanged(),
    map((toolName) => tools[toolName]),
    switchMap((tool) => {
      const template = tool({ $tx });
      return template;
    }),
    tap((template) => console.log(`[debug] active tool template`, template)),
    tap((template) => render(template, container))
  );

  $activeTool.subscribe();
}
