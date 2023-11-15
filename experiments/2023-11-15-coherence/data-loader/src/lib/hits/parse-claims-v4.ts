import { readFile, writeFile } from "fs/promises";
import path from "path";
import { getSimpleChatProxy, type ChatMessage } from "../azure/chat";
import type { ExportedClaim } from "./export-claims";
import { responseToList } from "./format";

export async function parseClaimsV4(claimsDir: string, filename: string) {
  const inputFilePath = path.join(claimsDir, filename);
  console.log("Loading file", inputFilePath);
  const inputFile = await readFile(inputFilePath, "utf-8");
  const inputJson = JSON.parse(inputFile) as ExportedClaim[];
  console.log("File loaded, item count", inputJson.length);

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");

  const results: any[] = [];

  const progress = {
    current: 0,
    success: 0,
    error: 0,
    total: inputJson.length,
  };

  const chunkSize = 100;

  for (let chunkStart = 0; chunkStart < inputJson.length; chunkStart += chunkSize) {
    await Promise.all(
      inputJson.slice(chunkStart, chunkSize).map(async (item) => {
        try {
          const response = await chatProxy({
            messages: composeInitialMessages(item),
            temperature: 0,
            max_tokens: 800,
          });

          const responseText = response.choices[0].message.content ?? "";
          console.log(`---[step 1]---\n${responseText}`);
          const response2 = await chatProxy({
            messages: composeFollowUpMessages({ role: "assistant", content: responseText }, item),
            temperature: 0,
            max_tokens: 800,
          });

          const triplesRaw = responseToList(response2.choices[0].message.content ?? "").listItems;
          const triples = triplesRaw
            .filter(Boolean)
            .map((line) => line.split("->").map((item) => item.trim().replaceAll("_", " ")))
            .filter((triple) => triple.length === 3)
            .map((triple) => triple.join(" -> "));

          console.log(`---[step 2]---\n${triples.join("\n")}`);
          results.push({ item, triples });
          progress.success++;
        } catch (e) {
          console.error(e);
          progress.error++;
        } finally {
          progress.current++;
        }

        console.log("Progress: ", JSON.stringify(progress));
        if ((progress.success + progress.error) % chunkSize === 0) {
          await writeFile(path.join(claimsDir, filename.split(".")[0] + "-parsed.json"), JSON.stringify(results, null, 2));
        }
      })
    );
  }
}

const SYSTEM_MESSAGE = `
You are a UX research domain experts. Analyze the claim from a usability study. Aggressively reduce the claim into a list. Each item is generalized in news headline style.
...
`.trim();

const USER_MESSAGE_2 = `
Rephrase the list as logical triples
Generalize all users and participants as "Participant"
Split compound subject and object phrases into multiple indivisible triples.
Use format
- Subject -> Predicate -> Object
- Subject -> Predicate -> Object
...
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
