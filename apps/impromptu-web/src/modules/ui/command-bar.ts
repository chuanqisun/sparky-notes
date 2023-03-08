import type { SelectionSummaryV2 } from "@impromptu/types";

export function handleSelectionChange(selectionSummary: SelectionSummaryV2) {
  document.querySelector<HTMLButtonElement>(`[data-action="clear"]`)!.disabled = !selectionSummary.dataNodeIds.length;
}

export function handleStarted() {
  const button = document.querySelector<HTMLButtonElement>(`[data-role="toggleStart"]`)!;

  button.innerText = "Stop";
  button.setAttribute("data-action", "stop");
}

export function handleStopped() {
  const button = document.querySelector<HTMLButtonElement>(`[data-role="toggleStart"]`)!;

  button.innerText = "Start";
  button.setAttribute("data-action", "start");
}
