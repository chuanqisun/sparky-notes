import { filter, fromEvent, map, type Observable } from "rxjs";

export interface DataAction {
  target: HTMLElement;
  action: string;
}

export const $dataAction: (root: EventTarget) => Observable<DataAction> = (root) =>
  fromEvent(root, "click").pipe(
    map((e) => (e.target as HTMLElement).closest("[data-action]")),
    filter(isHTMLElement),
    map((target) => {
      const action = target.getAttribute("data-action")!;
      return { target, action };
    })
  );

export function filterByAction(action: string) {
  return filter((event: DataAction) => event.action === action);
}

function isHTMLElement(target: any): target is HTMLElement {
  return target instanceof HTMLElement;
}
