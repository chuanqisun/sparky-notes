import type { ModelName } from "../openai/types";
import { Clock } from "./task";
import type { IChatManager, IChatWorker, IClock } from "./types";

export interface ChatWorkerConfig {
  models: ModelName[];
  maxConcurrency: number;
  tokensPerMinute: number;
  clockInterval: number;
}

// TODO request based on capacity
// ref: https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/quota#understanding-rate-limits
// check model compatibility
// check tpm capacity (1 min window: < tpm limit)
// check tpm capacity (10 sec window: < (tpm - consumed)/6 if not first req)
// check tpm capacity (1 sec window: < (tpm - consumed)/60 if not first req)
// check max parallelism

export class ChatWorker implements IChatWorker {
  private pendingTasks: any[] = [];
  private clock: IClock;

  constructor(private config: ChatWorkerConfig) {
    this.clock = new Clock(config.clockInterval);
  }

  public start(manager: IChatManager) {
    this.clock.off();
    this.clock.on(() => this.pollNextTask(manager));
  }

  private pollNextTask(manager: IChatManager) {
    // calculate capacity
    const task = manager.requestTask({ capacity: 999 });
    if (task) {
      this.pendingTasks.push(task);
      this.runTask(manager, task);
    }
  }

  private async runTask(manager: IChatManager, task: any) {
    // mock async run task
    await new Promise((resolve) => setTimeout(resolve, 1000));
    manager.respondTask(task, { result: "ok" });
    this.clock.on(() => this.pollNextTask(manager));
  }
}
