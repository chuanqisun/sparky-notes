import type { ChildProcess } from "child_process";
import { fork } from "node:child_process";
import type { DbWorkerRequest } from "./cozo-worker";

const MAX_QUERY_PER_WORKER = 999999; // need to spawn due to memory leak

export interface CozoProxyConfig {
  workerPath: string;
  dbPath: string;
  initSchema?: string;
}
export class CozoProxy {
  private workerPromise: Promise<ChildProcess>;
  private mid = 0;
  private queryCount = 0;

  constructor(private config: CozoProxyConfig) {
    this.workerPromise = this.createWorker();
  }

  async restart() {
    await this.stop();
    this.workerPromise = this.createWorker();
  }

  async run(query: string, params?: any): Promise<any> {
    if (++this.queryCount === MAX_QUERY_PER_WORKER) {
      this.queryCount = 0;
      await this.restart();
    }
    return this.request(await this.workerPromise, { run: { query, params } });
  }

  private async createWorker() {
    const worker = fork(this.config.workerPath, ["rocksdb", this.config.dbPath], { stdio: ["inherit", "inherit", "inherit", "ipc"] });
    await this.request(worker, { ensureSchema: this.config.initSchema });
    console.log("[worker proxy] created");

    return worker;
  }

  private request(worker: ChildProcess, message: Omit<DbWorkerRequest, "_mid">): Promise<any> {
    const reqMessageId = ++this.mid % Number.MAX_SAFE_INTEGER;
    return new Promise(async (resolve, reject) => {
      const handleMatchedResponse = (res: any) => {
        const { _mid, ...response } = res;
        if (reqMessageId === _mid) {
          worker.off("message", handleMatchedResponse);

          if (response.error) {
            reject(response.error);
          } else {
            resolve(response.data);
          }
        }
      };

      worker.on("message", handleMatchedResponse);
      worker.send({ ...message, _mid: reqMessageId });
    });
  }

  async stop() {
    if (!this.workerPromise) return;
    await this.request(await this.workerPromise, { close: true });
    const worker = await this.workerPromise;
    worker.kill();
    console.log("[worker proxy] killed");
  }
}
