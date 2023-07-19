import type { ChatInput, ChatOutput } from "../openai/types";

export interface IChatTaskManager {
  submit: (task: IChatTask) => Promise<ChatOutput>;
}

export interface IChatWorkerManager {
  request: (request: IWorkerTaskRequest) => IChatTask | null;
  respond: (task: IChatTask, response: IWorkerTaskResponse) => void;
}

export interface IWorkerTaskRequest {
  tokenCapacity: number;
  models: string[];
}

export interface IWorkerTaskResponse {
  data?: ChatOutput;
  error?: any;
}

export interface IChatTask {
  tokenDemand: number;
  models: string[];
  input: ChatInput;
}

export interface IChatWorker {
  start: (manager: IChatWorkerManager) => void;
  stop: () => void;
}
