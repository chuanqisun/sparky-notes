declare global {
  interface IProcess {
    env: Record<string, string>;
  }

  export var process: IProcess;
}

export default process;
