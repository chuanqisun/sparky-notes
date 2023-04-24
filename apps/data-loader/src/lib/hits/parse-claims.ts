import { readdir, writeFile } from "fs/promises";
import path from "path";
import { getSimpleChatProxy, type SimpleChatProxy } from "../azure/chat";
import { EntityName } from "./entity";
import type { ExportedClaim } from "./export-claims";

export async function parseClaims(claimsDir: string, lensName = "ux-domain-concepts") {
  const claimChunkFiles = await readdir(claimsDir);
  console.log(`Chunk discovered:`, claimChunkFiles.length);

  const outputDir = path.resolve(claimsDir, `../claims-${lensName}`);
  console.log(`Output dir`, outputDir);

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");

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
    const bufferLimit = 10;

    await Promise.all(
      claims.map((claim) =>
        getUXDomainConcepts(chatProxy, claim)
          .then((concepts) => {
            progress.success++;
            return {
              ...claim,
              concepts,
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
            if (fileWriteBuffer.length >= bufferLimit) {
              const buffer = fileWriteBuffer;
              fileWriteBuffer = [];
              return writeFile(
                path.join(
                  outputDir,
                  `${chunkFilename.replace(".json", "")}-buffer-${`${bufferIndex++}`.padStart(Math.ceil(claims.length / bufferLimit), "0")}.json`
                ),
                JSON.stringify(buffer, null, 2)
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
Now analyze a claim in the provided context and detect UX domain concepts. Respond with 3 - 8 concepts in total, use this format:

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
          `
              Report in the context:

              ${[claim.claimTitle, claim.claimContent].join(" ")}
              `,
          `Extract concepts for the following claim:
          
${[claim.rootDocumentTitle, claim.rootDocumentContext].join(" ")}`,
        ].join("\n\n"),
      },
    ],
    max_tokens: 500,
  });

  const responseText = response.choices[0].message.content ?? "";

  const concepts = responseText
    .split("\n")
    .map((line) => line.trim().match(/^concept\s*\d+\s+summary\:(.+)/i)?.[1] ?? "")
    .filter(Boolean);

  console.log(`
---      
https://hits.microsoft.com/${EntityName[claim.claimType]}/${claim.claimId}
Tokens usage: ${response.usage.total_tokens}
${concepts.map((concept) => `- ${concept}`).join("\n")}
  `);

  console.log(`Raw response:`, responseText);

  return concepts;
}
