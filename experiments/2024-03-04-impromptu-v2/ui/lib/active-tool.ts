import { render, type TemplateResult } from "lit-html";
import { distinctUntilChanged, Observable, switchMap, tap } from "rxjs";

export type Tool = Observable<TemplateResult>;

export function useActiveTool(config: { $selectedToolName: Observable<string>; tools: Record<string, Tool>; container: HTMLElement }) {
  const { $selectedToolName, container, tools } = config;
  const $activeTool = $selectedToolName.pipe(
    distinctUntilChanged(),
    switchMap((toolName) => tools[toolName]),
    tap((template) => render(template, container))
  );

  $activeTool.subscribe();
}
