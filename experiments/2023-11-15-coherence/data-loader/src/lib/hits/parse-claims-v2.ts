import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import path from "path";
import { getLoadBalancedChatProxy, type ChatMessage, type SimpleChatProxy } from "../azure/chat";
import { getEmbeddingProxy } from "../azure/embedding";
import { deleteEmbedding, initializeEmbeddingsDb } from "./bulk-embed";
import { EntityName } from "./entity";
import type { ExportedClaim } from "./export-claims";

export async function claimV2ToV3(claimsDir: string, lensName: string) {
  const dirTimestamp = "1682558698713"; // replace with target dirname
  const inputDir = path.resolve(claimsDir, `../claims-${lensName}-${dirTimestamp}`);
  const outputDir = path.resolve(claimsDir, `../claims-${lensName}-${Date.now()}`);
  const bufferFiles = await readdir(inputDir);
  console.log(`Input dir`, inputDir);

  await mkdir(outputDir, { recursive: true });
  console.log("Ouput dir", outputDir);

  for (const bufferFile of bufferFiles) {
    const fileContent = await readFile(path.join(inputDir, bufferFile), "utf8");
    const claims = JSON.parse(fileContent) as (ExportedClaim & { concepts: { concept: string; embedding: number[] }[] })[];

    const v3Claims = claims.map((claim) => ({ ...claim, concepts: undefined, triples: claim.concepts.map((concept) => concept.concept) }));

    await writeFile(path.join(outputDir, bufferFile), JSON.stringify(v3Claims, null, 2), "utf8");
  }
}

export async function fixClaimsV2Db(dbPath: string, claimsDir: string, lensName: string) {
  // remove underscore terms in db

  const startBufferIndex = 0;

  const db = await initializeEmbeddingsDb(dbPath);

  const dirTimestamp = "1682643076670"; // replace with target dirname
  const inputDir = path.resolve(claimsDir, `../claims-${lensName}-${dirTimestamp}`);
  const bufferFiles = await readdir(inputDir);
  console.log(`Input dir`, inputDir);

  const progress = {
    fix: 0,
    skip: 0,
    currentBuffer: startBufferIndex,
    bufferCount: bufferFiles.length,
  };

  for (const bufferFile of bufferFiles.slice(startBufferIndex)) {
    progress.currentBuffer++;

    const fileContent = await readFile(path.join(inputDir, bufferFile), "utf8");
    const claims = JSON.parse(fileContent) as (ExportedClaim & { triples: string[] })[];

    for (const claim of claims) {
      await Promise.all(
        claim.triples.map(async (relation) => {
          const triples = relation.split(" -> ");
          for (let triple of triples) {
            if (triple.includes("_")) {
              await deleteEmbedding(db, triple);
              console.log(`Deleted: |${triple}|`);
              progress.fix++;
            } else {
              progress.skip++;
            }
          }
        })
      );
    }
  }

  console.log(`Progress: ${JSON.stringify(progress)}`);
}

export async function fixClaimsV2Underscore(claimsDir: string, lensName: string) {
  // reparse items that do not have concept items

  const startBufferIndex = 0;

  const dirTimestamp = "1682643076670"; // replace with target dirname
  const inputDir = path.resolve(claimsDir, `../claims-${lensName}-${dirTimestamp}`);
  const outputDir = path.resolve(claimsDir, `../claims-${lensName}-${Date.now()}`);
  await mkdir(outputDir, { recursive: true });
  const bufferFiles = await readdir(inputDir);
  console.log(`Input dir`, inputDir);
  console.log(`Output dir`, outputDir);

  const progress = {
    fix: 0,
    skip: 0,
    currentBuffer: startBufferIndex,
    bufferCount: bufferFiles.length,
  };

  for (const bufferFile of bufferFiles.slice(startBufferIndex)) {
    progress.currentBuffer++;

    const fileContent = await readFile(path.join(inputDir, bufferFile), "utf8");
    const claims = JSON.parse(fileContent) as (ExportedClaim & { triples: string[] })[];

    claims.forEach((claim) => {
      claim.triples = claim.triples.map((triple) => {
        if (triple.includes("_")) {
          const fixedTripleLine = triple.replaceAll("_", " ");
          console.log(` |${triple}| => |${fixedTripleLine}|`);
          progress.fix++;
          return fixedTripleLine;
        } else {
          progress.skip++;
          return triple;
        }
      });
    });

    writeFile(path.join(outputDir, bufferFile), JSON.stringify(claims, null, 2));
  }

  console.log(`Progress: ${JSON.stringify(progress)}`);
}

export async function fixClaimsV2(claimsDir: string, lensName: string) {
  // reparse items that do not have concept items

  const startBufferIndex = 0;

  const dirTimestamp = "1682558698713"; // replace with target dirname
  const outputDir = path.resolve(claimsDir, `../claims-${lensName}-${dirTimestamp}`);
  const bufferFiles = await readdir(outputDir);
  console.log(`Input dir`, outputDir);

  const chatProxy = getLoadBalancedChatProxy(process.env.OPENAI_API_KEY!, ["v4-8k", "v4-32k"]);
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

  const progress = {
    success: 0,
    error: 0,
    empty: 0,
    total: 0,
    currentBuffer: startBufferIndex,
    bufferCount: bufferFiles.length,
  };

  for (const bufferFile of bufferFiles.slice(startBufferIndex)) {
    progress.currentBuffer++;

    const fileContent = await readFile(path.join(outputDir, bufferFile), "utf8");
    const claims = JSON.parse(fileContent) as (ExportedClaim & { concepts: { concept: string; embedding: number[] }[]; conceptsError?: boolean })[];
    const failedClaims = claims.filter((claim) => claim.concepts.length === 0); // todo, only consider claims with conceptsError
    if (failedClaims.length === 0) continue;

    progress.total += failedClaims.length;

    await Promise.all(
      failedClaims.map((fixedClaim) =>
        uxClaimToTriples(chatProxy, fixedClaim)
          .then((concepts) => {
            return Promise.all(
              concepts.map(async (concept) => {
                return embeddingProxy({ input: concept })
                  .then((result) => ({
                    concept,
                    embedding: result.data[0].embedding,
                  }))
                  .catch((e) => {
                    console.error("Embedding failed", e);
                    return {
                      concept,
                      embedding: [],
                    };
                  });
              })
            );
          })
          .then((embeddedConcepts) => {
            if (embeddedConcepts.length === 0) {
              progress.empty++;
            } else {
              progress.success++;
            }
            return {
              ...fixedClaim,
              concepts: embeddedConcepts.filter((concept) => concept.embedding.length > 0),
            };
          })
          .catch((e) => {
            progress.error++;
            console.error(e);
            return {
              ...fixedClaim,
              concepts: [],
              conceptsError: true,
            };
          })
          .then((result) => {
            claims.find((claim) => claim.claimId === fixedClaim.claimId)!.concepts = result.concepts;

            console.log("flushed buffer", path.join(outputDir, bufferFile));
            return writeFile(path.join(outputDir, bufferFile), JSON.stringify(claims));
          })
          .finally(() => {
            console.log(`Progress: ${JSON.stringify(progress)}`);
          })
      )
    );

    console.log(failedClaims.map((claim) => claim.claimId));
  }
}

export async function parseClaimsV2(claimsDir: string, lensName: string) {
  const claimChunkFiles = await readdir(claimsDir);
  console.log(`Chunk discovered:`, claimChunkFiles.length);

  const SHOULD_RESUME = true;

  const startChunkIndex = SHOULD_RESUME ? 6 : 0; // to resume, start chunk should be the last unfinished chunk from previous run
  const startBufferIndex = SHOULD_RESUME ? 27 : 0; // to resume, start buffer should be the last unfinished buffer from previous run
  const bufferLimit = 20;
  const startFromTimestamp = SHOULD_RESUME ? 1682558698713 : Date.now();

  const outputDir = path.resolve(claimsDir, `../claims-${lensName}-${startFromTimestamp}`);
  console.log(`Output dir`, outputDir);

  await mkdir(outputDir, { recursive: true });

  const chatProxy = getLoadBalancedChatProxy(process.env.OPENAI_API_KEY!, ["v4-8k", "v4-32k"]);
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

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
    chunkTotal: claimChunkFiles.length,
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
          .then((concepts) => {
            return Promise.all(
              concepts.map(async (concept) => {
                return embeddingProxy({ input: concept })
                  .then((result) => ({
                    concept,
                    embedding: result.data[0].embedding,
                  }))
                  .catch((e) => {
                    console.error("Embedding failed", e);
                    return {
                      concept,
                      embedding: [],
                    };
                  });
              })
            );
          })
          .then((embeddedConcepts) => {
            progress.success++;
            return {
              ...claim,
              concepts: embeddedConcepts.filter((concept) => concept.embedding.length > 0),
            };
          })
          .catch((e) => {
            progress.error++;
            console.error(e);
            return {
              ...claim,
              concepts: [],
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

              return writeFile(path.join(outputDir, bufferFilename), JSON.stringify(buffer));
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
    .map((line) => line.split("->").map((item) => item.trim()))
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
