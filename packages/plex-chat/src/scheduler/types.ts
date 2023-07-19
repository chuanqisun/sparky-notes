export interface IChatWorker {
  start: (manager: IChatManager) => void;
}

export interface IChatManager {
  // user facing
  submit: (task: any) => Promise<any>;

  // worker facing
  requestTask: (req: any) => any | null;
  respondTask: (task: any, result: any) => void;
}

export interface IClock {
  // run the event handler every tick, start with the tick immediately
  on: (eventHandler: any) => void;
  off: () => void;
}
