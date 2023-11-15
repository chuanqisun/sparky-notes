import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import { getLoadBalancedChatProxy, type ChatMessage, type SimpleChatProxy } from "../azure/chat";
import { EntityName } from "./entity";
import type { ExportedClaim } from "./export-claims";

export async function parseClaimsV3(claimsDir: string, lensName: string) {
  const claimChunkFiles = await readdir(claimsDir);
  console.log(`Chunk discovered:`, claimChunkFiles.length);

  const SHOULD_RESUME = false;

  const startChunkIndex = SHOULD_RESUME ? 6 : 0; // to resume, start chunk should be the last unfinished chunk from previous run
  const startBufferIndex = SHOULD_RESUME ? 27 : 0; // to resume, start buffer should be the last unfinished buffer from previous run
  const bufferLimit = 3;
  const startFromTimestamp = SHOULD_RESUME ? 1682558698713 : Date.now();

  const outputDir = path.resolve(claimsDir, `../claims-${lensName}-${startFromTimestamp}`);
  console.log(`Output dir`, outputDir);

  await mkdir(outputDir, { recursive: true });

  const chatProxy = getLoadBalancedChatProxy(process.env.OPENAI_API_KEY!, ["v4-8k", "v4-32k"]);

  const knownIds = new Set<string>();
  const knownBuffers = await readdir(outputDir);

  for (let knownBuffer of knownBuffers) {
    const knownClaims = await readFile(path.join(outputDir, knownBuffer), "utf8");
    const matchInstances = [...knownClaims.matchAll(/"claimId":"(\d+)"/g)];
    matchInstances.map((matchInstance) => knownIds.add(matchInstance[1]));
  }

  console.log(`Resume from chunk ${startChunkIndex}, buffer ${startBufferIndex}, ${knownIds.size} known ids, ${knownBuffers.length} known buffers`);

  const progress = {
    success: 0,
    error: 0,
    total: 0,
    currentChunk: startChunkIndex,
    chunkMaxIndex: claimChunkFiles.length - 1,
  };

  for (let chunkIndex = startChunkIndex; chunkIndex < claimChunkFiles.length; chunkIndex++) {
    const chunkFilename = claimChunkFiles[chunkIndex];
    const claims: ExportedClaim[] = (await import(path.join(claimsDir, chunkFilename), { assert: { type: "json" } })).default;

    const isResumingChunk = chunkIndex === startChunkIndex;
    const remainingClaims = claims.filter((claim) => (isResumingChunk ? !knownIds.has(claim.claimId) : true));
    progress.total += remainingClaims.length;

    let bufferIndex = isResumingChunk ? startBufferIndex : 0;
    let fileWriteBuffer: ExportedClaim[] = [];

    await Promise.all(
      remainingClaims.map((claim) =>
        uxClaimToTriples(chatProxy, claim)
          .then((triples) => {
            progress.success++;
            return {
              ...claim,
              triples,
            };
          })
          .catch((e) => {
            progress.error++;
            console.error(e);
            return {
              ...claim,
              triples: [],
              triplesError: true,
            };
          })
          .then((result) => {
            fileWriteBuffer.push(result);
            if (fileWriteBuffer.length >= bufferLimit || progress.success + progress.error === progress.total) {
              const buffer = fileWriteBuffer;
              fileWriteBuffer = [];

              const bufferFilename = `${chunkFilename.replace(".json", "")}-buffer-${`${bufferIndex++}`.padStart(
                Math.ceil(claims.length / bufferLimit).toString().length,
                "0"
              )}.json`;
              console.log("Buffer flush", bufferFilename);

              return writeFile(path.join(outputDir, bufferFilename), JSON.stringify(buffer, null, 2));
            }
          })
          .finally(() => {
            console.log(`Progress: ${JSON.stringify(progress)}`);
          })
      )
    );

    progress.currentChunk++;
  }
}

// prompt issues:
// one to many and many to one relations can be condensed
// underscore should not appear as a variable name in the result.

async function uxClaimToTriples(chatProxy: SimpleChatProxy, claim: ExportedClaim): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        `
You are an ontology engineer with UX Research and Design domain expertise. You can parse a claim into triples: Subject -> Predicate -> Object. 

Requirements:
- The Subject and Object must be related to the UX Research and Design domain.
- The Subject and Object must be abstract concepts.
- The Subject and Object must not contain personal information.

Use this format:
- Triple 1: Subject -> Predicate -> Object 
- Triple 2: Subject -> Predicate -> Object 
- ...
`,
      ]
        .map((str) => str.trim())
        .join("\n\n")
        .trim(),
    },
    {
      role: "user",
      content: [
        `Now parse the following claim into ontology triples:   
${[claim.claimTitle, claim.claimContent].join("\n")}
        `.trim(),
        [
          // `Additional metadata:`,
          // claim.methods.length ? `Methods: ${claim.methods.join(", ")}` : "",
          // claim.topics.length ? `Topics: ${claim.topics.join(", ")}` : "",
          // claim.products.length ? `Products: ${claim.products.join(", ")}` : "",
          `-- Source: ${[claim.rootDocumentTitle].join(" ")}`,
        ].join("\n"),
      ].join("\n"),
    },
  ];

  const response = await chatProxy({
    messages,
    temperature: 0,
    max_tokens: 500,
  });

  const responseText = response.choices[0].message.content ?? "";

  const triples = responseText
    .split("\n")
    .map(
      (line) =>
        line
          .trim()
          .match(/triple\s*\d+\:\s*(.+)/i)?.[1]
          .trim() ?? ""
    )
    .filter(Boolean)
    .map((line) => line.split("->").map((item) => item.trim().replaceAll("_", " ")))
    .filter((triple) => triple.length === 3)
    .map((triple) => triple.join(" -> "));

  console.log(`---`);
  // console.log(`Raw request`, messages.map((message) => `${message.role}\n${message.content}`).join("\n\n"));
  console.log(`Raw response:`, responseText);
  console.log(`
https://hits.microsoft.com/${EntityName[claim.claimType]}/${claim.claimId}
Tokens usage: ${response.usage.completion_tokens} output, ${response.usage.total_tokens} total
${triples.map((triple) => `- ${triple}`).join("\n")}
  `);

  return triples;
}
