import type { SimpleChatProxy } from "../../azure/chat";
import { responseToList } from "../../hits/format";

export interface Concept {
  name: string;
  definition: string;
  alternativeNames: string[];
}
export async function getConcept(chatProxy: SimpleChatProxy, markdown: string): Promise<Concept> {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Define the main concept in the document. Use the definition to suggest up to 5 alternative names that are more intuitive for the UI/UX domain. Use format:

Concept: <Main concept short name>
Definition: <One sentence definition>
Alternative names:
- <Name 1>
- <Name 2>
...
`.trim(),
      },
      { role: "user", content: markdown },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";

  console.log("Pattern definition raw response", textResponse);

  const name = textResponse.match(/Concept: (.*)/)?.[1] ?? "";
  const definition = textResponse.match(/Definition: (.*)/)?.[1] ?? "";

  const lines = textResponse.split("\n");
  const alternativeNameLines = lines.slice(lines.findIndex((line) => line.startsWith("Alternative names:")) + 1).join("\n");
  const alternativeNames = responseToList(alternativeNameLines).listItems;

  return {
    name,
    definition,
    alternativeNames,
  };
}
