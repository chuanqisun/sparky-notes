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
