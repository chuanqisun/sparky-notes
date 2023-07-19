import type { ChatOutput } from "../openai/types";
import type { IChatTask, IChatTaskManager, IChatWorker, IChatWorkerManager, IWorkerTaskRequest, IWorkerTaskResponse } from "./types";

interface TaskHandle {
  task: IChatTask;
  resolve: (result: ChatOutput) => void;
  reject: (error: any) => void;
  isRunning?: boolean;
  retriesLeft?: number;
}

export class ChatManager implements IChatTaskManager, IChatWorkerManager {
  private taskHandles: TaskHandle[] = [];

  constructor(private workers: IChatWorker[]) {}

  public async submit(task: IChatTask) {
    return new Promise<ChatOutput>((resolve, reject) => {
      const taskHandle: TaskHandle = {
        task,
        resolve,
        reject,
      };
      this.taskHandles.push(taskHandle);
      console.log(`[manager] ${this.taskHandles.length} tasks | ${this.workers.length} workers`);
      this.workers.forEach((worker) => worker.start(this));
    });
  }

  public request(req: IWorkerTaskRequest): IChatTask | null {
    if (!this.taskHandles.length) {
      console.log(`[manager] all tasks completed, stopping workers`);
      this.workers.forEach((worker) => worker.stop());
      return null;
    }

    const pendingTasks = this.taskHandles.filter((t) => !t.isRunning);
    const matchedTask = this.getMatchedTask(req, pendingTasks);

    if (!matchedTask) {
      console.log(`[manager] no task found from ${pendingTasks.length} pending tasks`);
      return null;
    }

    console.log(`[manager] task found from ${pendingTasks.length} pending tasks`);
    matchedTask.isRunning = true;
    return matchedTask.task;
  }

  public respond(task: IChatTask, result: IWorkerTaskResponse) {
    const taskHandle = this.taskHandles.find((t) => t.task === task);
    if (!taskHandle) throw new Error("task not found");

    this.taskHandles = this.taskHandles.filter((t) => t !== taskHandle);
    if (result.error) {
      taskHandle.reject(result.error); // todo handle error and retry
    } else {
      taskHandle.resolve(result.data!);
    }
  }

  private getMatchedTask(req: IWorkerTaskRequest, availableHandles: TaskHandle[]): TaskHandle | null {
    return (
      availableHandles.find((handle) => {
        return (
          // model matched
          handle.task.models.some((demandedModel) => req.models.includes(demandedModel)) &&
          // token limit matched
          handle.task.tokenDemand <= req.tokenCapacity
        );
      }) ?? null
    );
  }
}
