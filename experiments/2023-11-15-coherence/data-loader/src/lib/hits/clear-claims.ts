import { mkdir, rm } from "fs/promises";

export async function clearClaims(outputDir: string) {
  await rm(outputDir, { recursive: true }).catch();
  await mkdir(outputDir, { recursive: true });
}
