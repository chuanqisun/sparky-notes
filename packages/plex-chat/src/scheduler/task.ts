import type { IClock } from "./types";

export class Clock implements IClock {
  private isRunning = false;
  private clearHandle: any;
  private eventHandler: any;

  constructor(private interval: number) {}

  public on(eventHandler: any) {
    this.off();
    this.eventHandler = eventHandler;
    this.isRunning = true;
    this.tick();
  }

  private tick() {
    this.eventHandler();
    this.clearHandle = setTimeout(() => {
      if (this.isRunning) this.tick();
    }, this.interval);
  }

  public off() {
    this.isRunning = false;
    clearTimeout(this.clearHandle);
  }
}
