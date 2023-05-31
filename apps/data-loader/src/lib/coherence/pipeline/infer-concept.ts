import type { SimpleChatProxy } from "../../azure/chat";

export async function getPatternDefinition(chatProxy: SimpleChatProxy, pattern: string, markdown: string) {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Define the concept called "${pattern}" based on the document. Respond with one sentence. Use format

Concept: ${pattern}
Definition: <One sentence definition>
`.trim(),
      },
      { role: "user", content: markdown },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";

  console.log("Pattern definition raw response", textResponse);

  const definition = textResponse.match(/Definition: (.*)/)?.[1] ?? "";
  return definition;
}
