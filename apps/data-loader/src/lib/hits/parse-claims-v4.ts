import { readFile } from "fs/promises";
import path from "path";

export async function parseClaimsV4(claimsDir: string, filename: string) {
  const inputFilePath = path.join(claimsDir, filename);
  console.log("Loading file", inputFilePath);
  const inputFile = await readFile(inputFilePath, "utf-8");
  const inputJson = JSON.parse(inputFile);
  console.log("File loaded, item count", inputJson.length);
}
