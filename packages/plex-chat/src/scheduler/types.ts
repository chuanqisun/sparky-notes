export interface IChatWorker {
  start: (manager: IChatWorkerManager) => void;
}

export interface IChatWorkerManager {
  requestTask: (req: IWorkerTaskRequest) => any | null;
  respondTask: (req: IWorkerTaskRequest, result: any) => void;
}

export interface IWorkerTaskRequest {
  tokenLimit: number;
  models: string[];
}

export interface IChatTaskManager {
  // user facing
  submit: (task: any) => Promise<any>;
}

export interface IUserTask {}
