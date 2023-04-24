import { readdir } from "fs/promises";
import path from "path";
import { getSimpleChatProxy, type SimpleChatProxy } from "../azure/chat";
import { EntityName } from "./entity";
import type { ExportedClaim } from "./export-claims";

export async function parseClaims(claimsDir: string, lensName = "ux-domain-concepts") {
  const claimChunkFiles = await readdir(claimsDir);
  console.log(`Chunk discovered:`, claimChunkFiles.length);

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v4-8k");

  const progress = {
    success: 0,
    error: 0,
    total: 0,
    currentChunk: 0,
    chunkTotal: claimChunkFiles.length,
  };

  for (let chunkIndex = 0; chunkIndex < claimChunkFiles.length; chunkIndex++) {
    const chunkFilename = claimChunkFiles[chunkIndex];
    progress.total += claimChunkFiles.length;
    const claims: ExportedClaim[] = (await import(path.join(claimsDir, chunkFilename), { assert: { type: "json" } })).default;

    const parsedClaims = await Promise.all(
      claims.map((claim) =>
        getUXDomainConcepts(chatProxy, claim)
          .then((concepts) => ({
            ...claim,
            concepts,
          }))
          .then(() => progress.success++)
          .catch((e) => {
            progress.error++;
            console.error(e);
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
You are an ontology engineer and UX research domain expert. You are analyzing the following claim:

${[claim.rootDocumentTitle, claim.rootDocumentContext].join(" ")} 
              `,
          `
You must interprete claim in the context of a report and extract a list of concepts for the UX research domain. Focus on these types:
- UI design pattern
- UI element, component, and widget
- Usability issue
- Design principle
- User behavior
- User pain point
- Recommended design
- Research question
- Known issues
- Follow up question`,
          `
Respond with one concept per line, 5 concepts at most. in a list like this:

Type of concept 1: ...
Concept 1: ...

Type of concept 2: ...
Concept 2: ...

...

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
              ${[claim.claimTitle, claim.claimContent].join(" ")}`,
          `What UX concepts does the following claim have: ${[claim.rootDocumentTitle, claim.rootDocumentContext].join(" ")}`,
        ].join("\n\n"),
      },
    ],
    max_tokens: 500,
  });

  const responseText = response.choices[0].message.content ?? "";

  const concepts = responseText
    .split("\n")
    .map((line) => line.trim().match(/^concept\s*\d+\:(.+)/i)?.[1] ?? "")
    .filter(Boolean);

  console.log(`
---      
https://hits.microsoft.com/${EntityName[claim.claimType]}/${claim.claimId}
Tokens usage: ${response.usage.total_tokens}
${concepts.map((concept) => `- ${concept}`).join("\n")}
  `);

  return concepts;
}
