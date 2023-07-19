import type { IChatTaskManager, IChatWorker, IChatWorkerManager, IWorkerTaskRequest } from "./types";

interface TaskHandle {
  task: any;
  resolve: (result: any) => void;
  reject: (error: any) => void;
  isRunning?: boolean;
  retriesLeft?: number;
}

// Chat manager is responsible for pushing task when its task queue has changes

export class ChatManager implements IChatTaskManager, IChatWorkerManager {
  private taskHandles: TaskHandle[] = [];

  constructor(private workers: IChatWorker[]) {}

  public async submit(task: any) {
    return new Promise((resolve, reject) => {
      const taskHandles: TaskHandle = {
        task,
        resolve,
        reject,
      };
      this.taskHandles.push(taskHandles);
      this.workers.forEach((worker) => worker.start(this));
    });
  }

  public requestTask(req: IWorkerTaskRequest) {
    // select from pending tasks
    // assign to worker
    if (!this.taskHandles.length) return null;

    const candidateTask = this.taskHandles.at(0)!; // todo, capacity and model check
    candidateTask.isRunning = true;
    return candidateTask.task;
  }

  public respondTask(task: any, result: any) {
    const taskHandle = this.taskHandles.find((t) => t.task === task);
    if (!taskHandle) throw new Error("task not found");

    this.taskHandles = this.taskHandles.filter((t) => t !== taskHandle);
    taskHandle.resolve(result); // todo handle error
  }
}
