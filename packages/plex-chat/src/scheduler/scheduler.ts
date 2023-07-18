export interface IChatWorker {
  tryAssign: (task: any) => boolean;
  onDone: (eventHandler: any) => void;
  onCapacityChange: (eventHandler: any) => void;
}

export interface IChatManager {
  addWorkers: (...workers: IChatWorker[]) => void;
  submit: (task: any) => Promise<any>;
}

export interface IClock {
  start: () => {};
  stop: () => {};
  onTick: (eventHandler: any) => void;
}

class ChatManager implements IChatManager {
  private workers: IChatWorker[] = [];
  private pendingTasks: any[] = [];

  constructor(private clock: IClock) {
    clock.onTick(() => this.assignTasks());
  }

  public start() {
    this.clock.start();
  }

  public stop() {
    this.clock.stop();
  }

  public addWorkers(...workers: IChatWorker[]) {
    workers.forEach((worker) => {
      worker.onDone(() => {});
      worker.onCapacityChange(() => {});
      this.workers.push(worker);
    });
  }

  public async submit(task: any) {
    this.pendingTasks.push(task);
  }

  private assignTasks() {
    this.workers.forEach((worker) => {
      for (const task of this.pendingTasks) {
        if (worker.tryAssign(task)) {
          this.pendingTasks = this.pendingTasks.filter((t) => t !== task);
          break;
        }
      }
    });
  }
}
