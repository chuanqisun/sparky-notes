import { readdir } from "fs/promises";
import { getEmbeddingProxy } from "../azure/embedding";
import type { ExportedClaim } from "./claim-export";

// TODO this is a WIP
export async function embedClaims() {
  const claimChunkFiles = await readdir("./data/claims");
  console.log(`Will embed ${claimChunkFiles.length} files`);

  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!, process.env.OPENAI_EMBEDDINGS_ENDPOINT!);

  let i = 0;
  for (let filename of claimChunkFiles) {
    const claims: ExportedClaim[] = (await import("../data/claims/" + filename, { assert: { type: "json" } })).default;
    const embedding = (await embeddingProxy({ input: claims[0].claimTitle })).data[0].embedding;
    console.log(new Date().toLocaleTimeString(), embedding.length);
    i++;
    if (i > 5) break;
  }
}
