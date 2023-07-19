import { Poller } from "./poller";
import type { IChatWorker, IChatWorkerManager, IWorkerTaskRequest } from "./types";

export interface IPoller {
  // run the event handler at interval, do not start immediately
  set: (eventHandler: any) => void;
  unset: () => void;
}

export interface ChatWorkerConfig {
  models: string[];
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

// Chat worker is responsible for polling task when its self has change in capacity
// Only chat manager can stop chat worker polling

export class ChatWorker implements IChatWorker {
  private tasks: any[] = [];
  private poller: IPoller;
  private previousRequest: IWorkerTaskRequest | null = null;

  constructor(private config: ChatWorkerConfig) {
    this.poller = new Poller(config.clockInterval);
  }

  public start(manager: IChatWorkerManager) {
    // poll immediately because start was requested by the manager
    this.poll(manager, this.updateTaskRequest().request);
    // start interval based polling because capacity might have changed
    this.poller.unset();
    this.poller.set(() => {
      const taskRequestChange = this.updateTaskRequest();
      if (taskRequestChange.isChanged) {
        this.poll(manager, taskRequestChange.request);
      }
    });
  }

  public stop() {
    this.poller.unset();
  }

  private updateTaskRequest(): { isChanged: boolean; request: IWorkerTaskRequest } {
    const request = this.getTaskRequest();
    const isChanged = JSON.stringify(request)! == JSON.stringify(this.previousRequest);
    this.previousRequest = request;

    return { isChanged, request };
  }

  private getTaskRequest(): IWorkerTaskRequest {
    return {
      tokenLimit: 100,
      models: [],
    };
  }

  private poll(manager: IChatWorkerManager, request: IWorkerTaskRequest) {
    const task = manager.request(request);
    if (task) {
      this.tasks.push(task);
      this.runTask(manager, task);
    }
  }

  private async runTask(manager: IChatWorkerManager, task: any) {
    // mock async run task
    await new Promise((resolve) => setTimeout(resolve, 1000));
    manager.respond(task, { output: {} as any });

    // after each run, restart the poller because capacity might have changed
    this.start(manager);
  }
}
