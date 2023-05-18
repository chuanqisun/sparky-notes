import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getSimpleChatProxy, type ChatMessage } from "../azure/chat";
import type { ExportedClaim } from "./export-claims";

export async function parseClaimsV4(claimsDir: string, filename: string) {
  const inputFilePath = path.join(claimsDir, filename);
  console.log("Loading file", inputFilePath);
  const inputFile = await readFile(inputFilePath, "utf-8");
  const inputJson = JSON.parse(inputFile);
  console.log("File loaded, item count", inputJson.length);

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");

  const results: any[] = [];

  const progress = {
    current: 0,
    success: 0,
    error: 0,
    total: inputJson.length,
  };

  for (const item of inputJson) {
    try {
      const { claimId, claimTitle } = item;

      const response = await chatProxy({
        messages: [], // TODO
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

      results.push({ claimId, claimTitle });
      progress.success++;
    } catch (e) {
      console.error(e);
      progress.error++;
    } finally {
      progress.current++;
    }

    if ((progress.success + progress.error) % 100 === 0) {
      console.log("Progress: ", JSON.stringify(progress));
      await writeFile(path.join(claimsDir, filename.split(".")[0] + "-parsed.json"), JSON.stringify(results, null, 2));
    }
  }
}

const SYSTEM_MESSAGE = `
You are a UX research domain experts. Analyze the claim from a usability study. Aggressively reduce the claim into a list. Each item is generalized in news headline style.
`.trim();

const USER_MESSAGE_2 = `
Rephrase the list as logical triples, use format <subject> -> <predicate> -> <object>
Generalize all users and participants as "Participant"
Split compound subject and object phrases into multiple indivisible triples.
`.trim();

function composeInitialMessages(claim: ExportedClaim): ChatMessage[] {
  return [
    {
      role: "system",
      content: SYSTEM_MESSAGE,
    },
    {
      role: "user",
      content: composeClaimMessage(claim),
    },
  ];
}

function composeFollowUpMessages(assistantMessage: ChatMessage, claim: ExportedClaim): ChatMessage[] {
  return [
    ...composeInitialMessages(claim),
    assistantMessage,
    {
      role: "user",
      content: USER_MESSAGE_2,
    },
  ];
}

function composeClaimMessage(claim: ExportedClaim): string {
  return [
    [claim.claimTitle, claim.claimContent].join("\n").trim(),
    [
      // `Additional metadata:`,
      // claim.methods.length ? `Methods: ${claim.methods.join(", ")}` : "",
      // claim.topics.length ? `Topics: ${claim.topics.join(", ")}` : "",
      // claim.products.length ? `Products: ${claim.products.join(", ")}` : "",
      `-- Source: ${[claim.rootDocumentTitle].join(" ")}`,
    ].join("\n"),
  ].join("\n");
}
