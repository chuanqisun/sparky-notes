import { render } from "lit-html";
import { distinctUntilChanged, map, tap, type Observable } from "rxjs";
import type { DataNode } from "../../../types/message";
import { renderObjectTree } from "./object-tree";

export function useDataViewer(props: { $data: Observable<DataNode | null>; container: HTMLElement }) {
  props.$data
    .pipe(
      distinctUntilChanged(),
      map((data) => renderObjectTree({ data: JSON.parse(data?.blob ?? "null") })),
      tap((template) => render(template, props.container))
    )
    .subscribe();
}
