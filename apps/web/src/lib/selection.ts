import { ContentNode } from "@sticky-plus/figma-ipc-types";
import { BehaviorSubject } from "rxjs";
import { proxyToFigma } from "./proxy";

export function useSelection() {
  const selection$ = new BehaviorSubject<ContentNode[]>([]);

  proxyToFigma.listen((msg) => {
    if (!msg.selectionChanged) return;
    selection$.next(msg.selectionChanged.contentNodes);
  });

  // request initial selection
  proxyToFigma.notify({ detectSelection: true });

  selection$.pipe().subscribe(setSelection);
}

export function setSelection(data: any) {
  document.querySelector("#selection-json")!.textContent = JSON.stringify(data, null, 2);
}
