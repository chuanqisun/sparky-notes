import { render, type TemplateResult } from "lit-html";
import { filter, first, map, merge, mergeMap, Observable, of, Subject, switchMap, tap } from "rxjs";
import type { MessageFromFigma, MessageFromUI } from "../../types/message";

export interface ToolInput {
  id: string;
  parsedBlob: any;
  $tx: Subject<MessageFromUI>;
}
export type Tool = (props: ToolInput) => Observable<TemplateResult>;

export function useActiveTool(config: { $rx: Observable<MessageFromFigma>; $tx: Subject<MessageFromUI>; tools: Record<string, Tool>; container: HTMLElement }) {
  const { $rx, $tx, container, tools } = config;
  const $activeTool = $rx.pipe(
    filter((msg) => !!msg.selectionChange), // filter to selection changes
    map((msg) => msg.selectionChange!.toolNodes.at(0)), // first tool node
    switchMap((maybeNode) => {
      if (maybeNode === undefined) return of(null);

      const $nodeBlob = $rx.pipe(
        first((msg) => msg.nodeBlob?.id === maybeNode.id),
        map((msg) => msg.nodeBlob!)
      );

      const $nodeBlobUpdates = $rx.pipe(
        filter((e) => !!e.nodeBlobChanges?.length),
        mergeMap((e) => e.nodeBlobChanges!),
        filter((change) => change.id === maybeNode.id)
      );

      $tx.next({ getNodeBlobById: maybeNode.id });

      return merge($nodeBlob, $nodeBlobUpdates);
    }),
    switchMap((nodeBlob) => {
      let parsedBlob: any;

      try {
        parsedBlob = nodeBlob ? JSON.parse(nodeBlob.blob ?? "") : null;
      } catch {}

      const matchedTool = tools[parsedBlob?.name] ?? tools.noTool;
      const toolContext = { id: nodeBlob?.id ?? "", parsedBlob, $tx };
      return matchedTool(toolContext);
    }),
    tap((template) => render(template, container))
  );

  $activeTool.subscribe();
}
