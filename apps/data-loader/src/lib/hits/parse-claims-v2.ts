import { mkdir, readdir, writeFile } from "fs/promises";
import path from "path";
import { getSimpleChatProxy, type SimpleChatProxy } from "../azure/chat";
import { getEmbeddingProxy } from "../azure/embedding";
import { EntityName } from "./entity";
import type { ExportedClaim } from "./export-claims";

export async function parseClaimsV2(claimsDir: string, lensName = "ux-domain-ontology") {
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
          `
You are an ontology engineer with UX Research and Design domain expertise. You can parse a statement into triples: Subject -> Predicate -> Object. The parsed triples must be based on one of the following known triples:

Hypothesis -> is type of -> Claim
Insight -> is type of -> Claim
Recommendation -> is type of -> Claim
Claim -> is supported by -> Evidence
Research Question -> leads to -> Hypothesis
User -> has -> Needs
User -> performs -> Tasks
Task -> can be -> Measured
Insight -> leads to -> Recommendation
Data -> can be -> Quantitative or Qualitative
Quantitative Data -> can be -> Analyzed statistically
Qualitative Data -> can be -> Categorized into themes
Research Method -> can be -> Quantitative or Qualitative
Quantitative Research Method -> uses -> Surveys or Experiments
Qualitative Research Method -> uses -> Interviews or Observations
User -> has -> Goals
User -> has -> Pain Points
Task -> has -> Difficulty Level
Insight -> is derived from -> Data Analysis
Recommendation -> is based on -> Insight
User Persona -> is created based on -> User Research
User Journey Map -> visualizes -> User Experience
Wireframe -> is a -> Low-fidelity Design
Prototype -> is a -> High-fidelity Design
Usability Testing -> evaluates -> Design
Accessibility -> is a -> Design consideration
UI Element -> has -> Visual Properties
UI Element -> has -> Functional Properties
UI Element -> can be -> Reused
Information Architecture -> organizes -> Content
Navigation -> facilitates -> User Flow
Interaction Design -> defines -> User Actions
Visual Design -> defines -> UI Aesthetics
Design System -> establishes -> Design Guidelines
Front-end Development -> implements -> Design
Back-end Development -> supports -> Front-end Development
Agile Methodology -> is used for -> Project Management
Sprint -> is a -> Time-boxed iteration of work
Product Manager -> coordinates -> Cross-functional teams. 
Ethnographic Research -> is a -> Qualitative Research Method
Heuristic Evaluation -> is a -> Expert Review Method
Design Thinking -> is a -> Human-centered approach to problem-solving
Card Sorting -> is a -> Information Architecture method
Design Critique -> is a -> Peer Review method
Mood Board -> is a -> Visual Design method
Atomic Design -> is a -> Design System methodology
Responsive Design -> adapts -> UI to different screen sizes and devices
Content Strategy -> plans -> Content creation and delivery
User Research -> is used to -> Understand User Needs
Creative Brief -> outlines -> Project Goals and Objectives
User Testing -> evaluates -> Design with Users
A/B Testing -> compares -> Two versions of a Design
Iterative Design -> is a -> Design process that involves continuous feedback and improvement
Design Sprint -> is a -> Time-boxed process for solving a specific Design challenge.

You will use this format for each parsed triple:

Parsed triple 1:
- Based on text: Subject -> Predicate -> Object 
- Based on known triple: Subject -> Predicate -> Object
Parsed triple 2:
`,
        ]
          .map((item) => item.trim())
          .join("\n"),
      },
      {
        role: "user",
        content: `Now use the ontology to parse the following into triples: ${query}`,
      },
    ],
    max_tokens: 500,
  });

  const responseText = response.choices[0].message.content ?? "";

  const triples = responseText
    .split("\n")
    .map(
      (line) =>
        line
          .trim()
          .match(/Based on known triple\:(.+)/i)?.[1]
          .trim() ?? ""
    )
    .filter(Boolean);

  return triples;
}

export function bulkEmbed(texts: string[]): Promise<number[][]> {
  const embeddingProxy = getEmbeddingProxy(process.env.OPENAI_API_KEY!);

  return Promise.all(texts.map((text) => embeddingProxy({ input: text }).then((res) => res.data[0].embedding)));
}

async function uxClaimToTriples(chatProxy: SimpleChatProxy, claim: ExportedClaim): Promise<string[]> {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: [
          `
You are an ontology engineer with UX Research and Design domain expertise. You can parse a claim into triples: Subject -> Predicate -> Object. 

Requirements:
- The Subject and Object must be related to the UX Research and Design domain.
- The Subject and Object must be abstract concepts.
- The Subject and Object must not contain personal information.

You will use this format:

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
        ].join("\n\n"),
      },
    ],
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

  console.log(`
---      
https://hits.microsoft.com/${EntityName[claim.claimType]}/${claim.claimId}
Tokens usage: ${response.usage.completion_tokens} output, ${response.usage.total_tokens} total
${triples.map((triple) => `- ${triple}`).join("\n")}
  `);

  console.log(`Raw response:`, responseText);

  return triples;
}
