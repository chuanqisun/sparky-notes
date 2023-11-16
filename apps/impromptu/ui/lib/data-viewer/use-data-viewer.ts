import { render } from "lit-html";
import { map, tap, type Observable } from "rxjs";
import { renderObjectTree } from "./object-tree";

export function useDataViewer(props: { $data: Observable<any>; container: HTMLElement }) {
  props.$data
    .pipe(
      map((data) => renderObjectTree({ data })),
      tap((template) => render(template, props.container))
    )
    .subscribe();
}
