export function useAutoFill() {
  document.addEventListener("click", (event) => {
    const trigger = (event.target as HTMLElement)?.closest("[data-action]") as HTMLElement;
    if (!trigger) return;

    if (trigger.dataset.action !== "auto-fill") return;

    const fillTarget = trigger.closest("form")?.querySelector("textarea");
    if (!fillTarget) return;

    fillTarget.value = trigger.textContent ?? "";
  });
}
