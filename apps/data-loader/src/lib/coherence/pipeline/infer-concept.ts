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

export async function inferUserGoals(chatProxy: SimpleChatProxy, conceptName: string, definition: string, alternativeNames: string[]) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
List underlying goals that the concept allows the user to achieve. Respond with a bullet list in this format:

- <Task 1>
- <Task 2>
...
`.trim(),
      },
      {
        role: "user",
        content: `
Concept: ${conceptName}
Definition: ${definition}
Alternative names: ${alternativeNames.join(", ")}
      `.trim(),
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const listItems = responseToList(claims.choices[0].message.content ?? "").listItems;
  return listItems;
}

export async function inferUserProblems(chatProxy: SimpleChatProxy, conceptName: string, definition: string, alternativeNames: string[]) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
List underlying problems the concept can solve. Each problem in plain text news headline style. Respond with a bullet list in this format:

- <Problem 1>
- <Problem 2>
...
`.trim(),
      },
      {
        role: "user",
        content: `
Concept: ${conceptName}
Definition: ${definition}
Alternative names: ${alternativeNames.join(", ")}
      `.trim(),
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const listItems = responseToList(claims.choices[0].message.content ?? "").listItems;
  return listItems;
}

export async function inferSupporters(chatProxy: SimpleChatProxy, conceptName: string, definition: string, alternativeNames: string[]) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Infer as many background factors as possible for users who will like concept. Respond with a bullet list in this format:

- <User description 1>
- <User description 2>
...
`.trim(),
      },
      {
        role: "user",
        content: `
Concept: ${conceptName}
Definition: ${definition}
Alternative names: ${alternativeNames.join(", ")}
      `.trim(),
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const listItems = responseToList(claims.choices[0].message.content ?? "").listItems;
  return listItems;
}

export async function inferProtesters(chatProxy: SimpleChatProxy, conceptName: string, definition: string, alternativeNames: string[]) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Infer as many background factors as possible for users who will dislike the concept. Respond with a bullet list in this format:

- <User description 1>
- <User description 2>
...
`.trim(),
      },
      {
        role: "user",
        content: `
Concept: ${conceptName}
Definition: ${definition}
Alternative names: ${alternativeNames.join(", ")}
      `.trim(),
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const listItems = responseToList(claims.choices[0].message.content ?? "").listItems;
  return listItems;
}

// TODO
// search for design recommendations
// search for heuristics
// search for "have you considered" situations
