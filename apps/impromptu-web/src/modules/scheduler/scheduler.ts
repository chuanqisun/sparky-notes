export const clock = new EventTarget();

let timer: number;

export function startClock() {
  timer = window.setInterval(() => clock.dispatchEvent(new CustomEvent("tick")), 3000);
}

export function stopClock() {
  window.clearInterval(timer);
}
