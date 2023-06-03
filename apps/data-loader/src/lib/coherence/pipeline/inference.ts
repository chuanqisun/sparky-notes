import type { ChatMessage, SimpleChatProxy } from "../../azure/chat";
import { EntityName } from "../../hits/entity";
import { responseToList } from "../../hits/format";

import { arrayToBulletList } from "../../hits/format";
import type { AggregatedItem } from "./semantic-search";

export async function getSemanticQueries(chatProxy: SimpleChatProxy, markdownFile: string, limitHint: number) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `You are a researcher assistant. The user will provide a document. You must generate a list of ${limitHint} semantic search queries for any evidence that supports or contradicts the document. Cover as many different angles as possible. Respond in bullet list. Use format:
- "<query 1>"
- "<query 2>"
...
          `,
      },
      { role: "user", content: markdownFile },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const listItems = responseToList(claims.choices[0].message.content ?? "").listItems;

  // remove surrounding quotation marks
  const queries = listItems.map((item) => item.replace(/^"(.*)"$/, "$1"));
  return queries;
}

export async function normalizeClaims(chatProxy: SimpleChatProxy, claims: string[], conceptName: string, definition: string) {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Disambiguate all pronouns in the items. Use the "${conceptName}" context:
${definition}

Respond with a bullet list in this format
- <Item 1>
- <Item 2>
...
`.trim(),
      },
      {
        role: "user",
        content: arrayToBulletList(claims),
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";
  console.log("Question -> Concept raw response:", textResponse);

  const listItems = responseToList(textResponse).listItems;
  return listItems;
}

export async function getClaims(chatProxy: SimpleChatProxy, markdownFile: string, limitHint: number) {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `Extract ${limitHint} claims in the document. Respond with bullet list in this format:
- <Claim 1>
- <Claim 2>
- ...
`,
      },
      {
        role: "user",
        content: markdownFile,
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";
  console.log("Question extraction raw response:", textResponse);

  const listItems = responseToList(textResponse).listItems;
  return listItems;
}

export async function getQuestions(chatProxy: SimpleChatProxy, markdownFile: string, limitHint: number) {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `Anticipate ${limitHint} questions related to the document. Use this format:

- <Question 1>
- <Question 2>
- ...
`,
      },
      {
        role: "user",
        content: markdownFile,
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";
  console.log("Question extraction raw response:", textResponse);

  const listItems = responseToList(textResponse).listItems;
  return listItems;
}

export async function questionToConcepts(chatProxy: SimpleChatProxy, questions: string[]) {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Rewrite each question as a noun phrase by replacing "why", "how", "who", "when", "where", "what" into noun phrase, such as "purpose", "method", "people", "time", "place", "thing".

Respond with a bullet list.
`.trim(),
      },
      {
        role: "user",
        content: arrayToBulletList(questions),
      },
    ],
    max_tokens: 500,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";
  console.log("Question -> Concept raw response:", textResponse);

  const listItems = responseToList(textResponse).listItems;
  return listItems;
}

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

export interface Guidance {
  dos: string[];
  donts: string[];
}
export async function getGuidance(chatProxy: SimpleChatProxy, markdown: string): Promise<Guidance> {
  const response = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
Identify the "Do" and "Don't" recommendation lists. Make sure the document explicitly used "Do" or "Don'ts" sentences. Respond in this format:

Have Dos or Don'ts?: <Yes/No>
Dos: <If exist, unordered bullet list of do items>
Don'ts: <If exist, unordered bullet list of don't items>
`.trim(),
      },
      { role: "user", content: markdown },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  const textResponse = response.choices[0].message.content ?? "";

  console.log("Guidance raw response", textResponse);

  const responseLines = textResponse
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const hasGuidance =
    responseLines
      .find((line) => line.toLocaleLowerCase().startsWith("have dos"))
      ?.toLocaleLowerCase()
      ?.includes("yes") ?? false;
  if (!hasGuidance) {
    console.log("no guidance found");
    return {
      dos: [],
      donts: [],
    };
  }

  const doLinesStartIndex = responseLines.findIndex((line) => line.toLocaleLowerCase().startsWith("dos"));
  const dontLinesStartIndex = responseLines.findIndex((line) => line.toLocaleLowerCase().startsWith("don'ts"));
  const doLinesEndIndex = dontLinesStartIndex > -1 ? dontLinesStartIndex : responseLines.length;
  const dontLinesEndIndex = responseLines.length;

  const doLinesChunk =
    doLinesStartIndex > -1
      ? responseLines
          .slice(doLinesStartIndex + 1, doLinesEndIndex)
          .filter((line) => line.startsWith("- "))
          .join("\n")
      : "";
  const dontLinesChunk =
    dontLinesStartIndex > -1
      ? responseLines
          .slice(dontLinesStartIndex + 1, dontLinesEndIndex)
          .filter((line) => line.startsWith("- "))
          .join("\n")
      : "";

  const dos = responseToList(doLinesChunk).listItems;
  const donts = responseToList(dontLinesChunk).listItems;

  return {
    dos,
    donts,
  };
}

export async function inferUserGoals(chatProxy: SimpleChatProxy, conceptName: string, definition: string, alternativeNames: string[]) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `
List underlying goals that the concept allows the user to achieve. Respond with a bullet list in this format:

- <Goal 1>
- <Goal 2>
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

export async function curateClaimsV2(chatProxy: SimpleChatProxy, concept: Concept, aggregatedItems: AggregatedItem[]) {
  const allFootNotes = aggregatedItems.map((item, index) => ({
    pos: index + 1,
    title: item.title,
    url: `https://hits.microsoft.com/${EntityName[item.entityType]}/${item.id}`,
  }));
  const textSources = aggregatedItems
    .map((item, index) =>
      `
Question ${index + 1}: ${item.queries.map((q) => q.decorated).join(", and ")}
Evidence ${index + 1}: ${item.caption}
`.trim()
    )
    .join("\n");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
Group the findings about "${concept.name}", defined as:

${concept.definition} It is also known as ${concept.alternativeNames.join(", ")}.

For each group of findings, write a one paragraph intro in objective and natural tone. Provide plenty of context. Make sure to connect findings with "${
        concept.name
      }" by identifying relations with "${concept.name}".

Under each group, list the findings. At the end of each finding, you must cite one or more evidence items that support the finding. Use square brackets, e.g. [1] for single citation, [1][2] for multiple.

Group 1: <humble and engaging title>
Intro: <One paragraph introduction>
Findings: <bullet list of findings>
- <Finding 1> [Evidence number]
- <Finding 2> [Evidence number]

Group 2: ...
Intro: ...
Findings: ...

...(repeat until *all* the findings are categorized)
`.trim(),
    },
    {
      role: "user",
      content: textSources,
    },
  ];

  const response = await chatProxy({ messages, max_tokens: 2000, temperature: 0 });
  const textResponse = response.choices[0].message.content ?? "";

  // TODO parse citation graph
  console.log("curation raw response", textResponse);
}
