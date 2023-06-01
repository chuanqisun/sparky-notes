import type { ChatMessage, SimpleChatProxy } from "../../azure/chat";

export interface FilterableClaim {
  id: string;
  caption: string;
}
export async function filterClaims(chatProxy: SimpleChatProxy, pattern: string, definition: string, claims: FilterableClaim[]) {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
Determine which of the provided claims mentioned the concept "${pattern}" with the following definition:

${definition}

Response with a list of ${claims.length} items. Each item must use this format:

Claim 1
Id: <Claim id>
Reason: <Describe how the claim specifically mentions the concept or its equivalent concepts>
Answer: <Yes/No>

Claim 2
...
`.trim(),
    },
    {
      role: "user",
      content: `
${claims
  .map((claim) =>
    `
Id: ${claim.id}
Claim: ${claim.caption} 
`.trim()
  )
  .join("\n\n")}      
`.trim(),
    },
  ];

  const filterResponse = await chatProxy({
    messages,
    max_tokens: 2000,
    temperature: 0,
  });

  const responseText = filterResponse.choices[0].message.content ?? "";

  console.log("Filter raw response", responseText);

  const idReasonAnswerTuples = responseText.matchAll(/Id: (.*)\nReason: (.*)\nAnswer: (.*)/gm) ?? [];
  const filteredClaimIds = [...idReasonAnswerTuples]
    .map(([, id, reason, answer]) => ({ id, reason, answer }))
    .filter((item) => item.answer.toLocaleLowerCase() === "yes")
    .map((item) => item.id);

  return filteredClaimIds;
}
