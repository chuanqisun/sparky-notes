import * as fsSync from "fs";
import fs from "fs/promises";
import path from "path";

export async function readFileSafe(path: string): Promise<string | null> {
  try {
    return await fs.readFile(path, "utf-8");
  } catch {
    return null;
  }
}

export async function writeJsonFile(filepath: string, data: any) {
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  await fs.writeFile(filepath, JSON.stringify(data, undefined, 2));
}

export class BufferedJsonFile<T = any> {
  private buffer: string | null = null;

  constructor(private path: string) {}

  init(initialBuffer: string) {
    try {
      this.buffer = fsSync.readFileSync(this.path, "utf-8");
    } catch (err) {
      if ((err as any).code === "ENOENT") {
        this.buffer = initialBuffer;
      } else {
        throw new Error("Error loading file to buffer");
      }
    }

    return this;
  }

  read() {
    if (this.buffer === null) throw new Error("Cannot read JSON buffer before it is loaded");

    try {
      return JSON.parse(this.buffer) as T;
    } catch {
      throw new Error("Error parsing buffered JSON file");
    }
  }

  write(object: T) {
    try {
      this.buffer = JSON.stringify(object, undefined, 2);
    } catch {
      throw new Error("Error stringify JSON object to buffer");
    }

    this.flush();

    return this;
  }

  async flush() {
    if (this.buffer === null) throw new Error("Cannot flush JSON buffer before it is loaded");

    try {
      await fs.mkdir(path.dirname(this.path), { recursive: true });
      await fs.writeFile(this.path, this.buffer);
    } catch (e) {
      console.log(e);
      throw new Error("Error flushing buffer to disk");
    }

    return this;
  }
}
