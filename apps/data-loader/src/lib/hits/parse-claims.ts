import { readdir } from "fs/promises";
import path from "path";
import { getSimpleChatProxy } from "../azure/chat";
import { EntityName } from "./entity";
import type { ExportedClaim } from "./export-claims";

export async function parseClaims(claimsDir: string) {
  const claimChunkFiles = await readdir(claimsDir);
  console.log(`Will parse ${claimChunkFiles.length} files`);

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");

  for (let filename of claimChunkFiles.slice(Math.round(Math.random() * 10))) {
    const claims: ExportedClaim[] = (await import(path.join(claimsDir, filename), { assert: { type: "json" } })).default;
    for (let claim of claims.slice(Math.round(Math.random() * 100))) {
      const response =
        (
          await chatProxy({
            messages: [
              {
                role: "system",
                content: [
                  `
You are an ontology engineer and UX research domain expert. You are analyzing the following claim:

${[claim.rootDocumentTitle, claim.rootDocumentContext].join(" ")} 
                  `,
                  `
You must interprete claim in the context of a report and extract a list of concepts in the UX research domain. Such concepts include:
- UI design patterns
- UI elements, components, and widgets
- Usability issues
- Design principles
- User behavior patterns
- Recommended designs
- Causal relationships between concepts
...
`,
                  `
Respond with one concept per line, in a list like this:

Concept 1: ...
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
          })
        ).choices[0].message.content ?? "";
      console.log(`
---      
https://hits.microsoft.com/${EntityName[claim.claimType]}/${claim.claimId}
${response}

      `);
    }
  }
}
