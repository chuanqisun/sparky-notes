import { mkdir, readdir, writeFile } from "fs/promises";
import path from "path";
import { getSimpleChatProxy, type SimpleChatProxy } from "../azure/chat";
import { getEmbeddingProxy } from "../azure/embedding";
import { EntityName } from "./entity";
import type { ExportedClaim } from "./export-claims";

export async function parseClaims(claimsDir: string, lensName = "ux-domain-concepts") {
  const claimChunkFiles = await readdir(claimsDir);
  console.log(`Chunk discovered:`, claimChunkFiles.length);

  const outputDir = path.resolve(claimsDir, `../claims-${lensName}`);
  console.log(`Output dir`, outputDir);

  await mkdir(outputDir, { recursive: true });

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v4-8k");
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

  const progress = {
    success: 0,
    error: 0,
    total: 0,
    currentChunk: 0,
    chunkTotal: claimChunkFiles.length,
  };

  for (let chunkIndex = 0; chunkIndex < claimChunkFiles.length; chunkIndex++) {
    const chunkFilename = claimChunkFiles[chunkIndex];
    const claims: ExportedClaim[] = (await import(path.join(claimsDir, chunkFilename), { assert: { type: "json" } })).default;
    progress.total += claims.length;

    let bufferIndex = 0;
    let fileWriteBuffer: ExportedClaim[] = [];
    const bufferLimit = 20;

    await Promise.all(
      claims.map((claim) =>
        getUXDomainConcepts(chatProxy, claim)
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
              return writeFile(
                path.join(
                  outputDir,
                  `${chunkFilename.replace(".json", "")}-buffer-${`${bufferIndex++}`.padStart(
                    Math.ceil(claims.length / bufferLimit).toString().length,
                    "0"
                  )}.json`
                ),
                JSON.stringify(buffer)
              );
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

export async function parseClaimQuery(query: string): Promise<string[]> {
  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v4-8k", true);

  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: [
          `You are an ontology engineer and UX (user experience) domain expert. You can detect abstract concepts in the UX domain, in one of these types:
- UI design pattern
- UI element, component, and widget
- Usability issue
- Design principle
- User behavior
- User pain point
- Recommended design
- Research question
- Known issues
- Design feedback
- User feedback
- Follow up question

Now analyze a statement and first respond with the goal behind the statement, and then detect UX domain concepts. Respond with 2-4 most useful concepts, use this format:

Goal: <What is the goal behind the statement?>

Concept 1 type: <Which type the concept below is?>
Concept 1 summary: <Summary of Concept 1, shorten to newspaper headline>

Concept 2 type: ...
Concept 2 summary: ...
`,
        ].join("\n"),
      },
      {
        role: "user",
        content: `Statement: ${query}`,
      },
    ],
    max_tokens: 500,
  });

  const responseText = response.choices[0].message.content ?? "";

  const concepts = responseText
    .split("\n")
    .map(
      (line) =>
        line
          .trim()
          .match(/^concept\s*\d+\s+summary\:(.+)/i)?.[1]
          .trim() ?? ""
    )
    .filter(Boolean);

  return concepts;
}

async function getUXDomainConcepts(chatProxy: SimpleChatProxy, claim: ExportedClaim): Promise<string[]> {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: [
          `
You are an ontology engineer and UX (user experience) domain expert. You can detect abstract concepts in the UX domain, in one of these types:
- UI design pattern
- UI element, component, and widget
- Usability issue
- Design principle
- User behavior
- User pain point
- Recommended design
- Research question
- Known issues
- Design feedback
- User feedback
- Follow up question`,
          `
Now analyze a claim in the provided context and detect UX domain concepts. Respond with 3 - 5 most useful concepts, use this format:

Concept 1 type: <Which type the concept below is?>
Concept 1 summary: <Summary of Concept 1, shorten to newspaper headline>

Concept 2 type: ...
Concept 2 summary: ...
`,
        ]
          .map((str) => str.trim())
          .join("\n\n")
          .trim(),
      },
      {
        role: "user",
        content: [
          claim.methods.length ? `Methods in the context: ${claim.methods.join(", ")}` : "",
          claim.topics.length ? `Topics in the context: ${claim.topics.join(", ")}` : "",
          claim.products.length ? `Products in the context: ${claim.products.join(", ")}` : "",
          `Report in the context: ${[claim.rootDocumentTitle].join(" ")}`,
          `Based on the context, extract concepts for the following claim:
              ${[claim.claimTitle, claim.claimContent].join(" ")}
`,
        ].join("\n\n"),
      },
    ],
    max_tokens: 500,
  });

  const responseText = response.choices[0].message.content ?? "";

  const concepts = responseText
    .split("\n")
    .map(
      (line) =>
        line
          .trim()
          .match(/^concept\s*\d+\s+summary\:(.+)/i)?.[1]
          .trim() ?? ""
    )
    .filter(Boolean);

  console.log(`
---      
https://hits.microsoft.com/${EntityName[claim.claimType]}/${claim.claimId}
Tokens usage: ${response.usage.completion_tokens} output, ${response.usage.total_tokens} total
${concepts.map((concept) => `- ${concept}`).join("\n")}
  `);

  console.log(`Raw response:`, responseText);

  return concepts;
}
