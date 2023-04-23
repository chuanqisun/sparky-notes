import { readdir } from "fs/promises";
import path from "path";
import { getSimpleChatProxy } from "../azure/chat";
import type { ExportedClaim } from "./export-claims";

export async function parseClaims(claimsDir: string) {
  const claimChunkFiles = await readdir(claimsDir);
  console.log(`Will parse ${claimChunkFiles.length} files`);

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!);

  let i = 0;
  for (let filename of claimChunkFiles) {
    const claims: ExportedClaim[] = (await import(path.join(claimsDir, filename), { assert: { type: "json" } })).default;
    const response = (await chatProxy({ messages: [{ role: "user", content: "hello!" }] })).choices[0].message.content ?? "";
    console.log(response);
    i++;
    if (i > 5) break;
  }
}
