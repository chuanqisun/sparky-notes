import type { ContentNode } from "@sparky-notes/figma-ipc-types";
import { BehaviorSubject } from "rxjs";
import { proxyToFigma } from "./proxy";

export const selection$ = new BehaviorSubject<ContentNode[]>([]);

export function useSelection() {
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
  document.querySelector("#selection-count")!.textContent = `(${data.length ? data.length : "empty"})`;
}

export function ensureSelection(selection: ContentNode[]) {
  if (!selection.length) {
    proxyToFigma.notify({
      showNotification: {
        message: "Please select at least one node.",
        config: { error: true },
      },
    });
    throw new Error("Selection is required");
  }

  return selection;
}
