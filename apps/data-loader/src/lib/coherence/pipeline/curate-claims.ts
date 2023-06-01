import type { ChatMessage, SimpleChatProxy } from "../../azure/chat";
import { EntityName } from "../../hits/entity";
import type { AggregatedItem } from "./semantic-search";

export async function curateClaims(chatProxy: SimpleChatProxy, pattern: string, aggregatedItems: AggregatedItem[]) {
  const allFootNotes = aggregatedItems.map((item, index) => ({
    pos: index + 1,
    title: item.title,
    url: `https://hits.microsoft.com/${EntityName[item.entityType]}/${item.id}`,
  }));
  const textSources = aggregatedItems.map((item, index) => `[${index + 1}] ${item.caption}`).join("\n");
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Summarize all the findings about the "${pattern}" concept into a 3-5 categories. Rephrase each finding as guidance. End each line with citations. Uncategorizable findings must be grouped under "Other". Use format:

- <Category name 1>
   - <Guidance 1> [Citation #s]
   - <Guidance 2> [Citation #s]
  ...
- <Category name 2>
...
- Other
  - <Uncategorized finding> [Citation #s]
  ...`,
    },
    {
      role: "user",
      content: textSources,
    },
  ];

  const response = await chatProxy({ messages, max_tokens: 800, temperature: 0 });
  const textResponse = response.choices[0].message.content ?? "";

  console.log("curation raw response", textResponse);

  const categories: {
    name: string;
    claims: {
      guidance: string;
      sources: { pos: number; url: string; title: string }[];
    }[];
  }[] = [];

  const lines = textResponse.split("\n");
  const categoryLineIndices = lines.map((line, index) => (line.startsWith("- ") ? index : -1)).filter((i) => i !== -1);
  for (let i = 0; i < categoryLineIndices.length; i++) {
    const categoryLineIndex = categoryLineIndices[i];
    const categoryName = lines[categoryLineIndex].replace("- ", "").trim();
    const citedClaims = lines
      .slice(categoryLineIndex + 1, categoryLineIndices[i + 1] ?? lines.length)
      .map((line) => {
        // regex, replace anything that is not a digit with space
        const { citations, text } = parseCitations(line);
        const sources = citations.map((pos) => allFootNotes.find((item) => item.pos === pos)!).filter(Boolean);
        const guidance = text.replace("- ", "").trim();
        return { guidance, sources };
      })
      .filter((item) => item.guidance && item.sources.length) as { guidance: string; sources: { pos: number; url: string; title: string }[] }[];

    if (citedClaims.length) {
      categories.push({ name: categoryName, claims: citedClaims });
    }
  }

  const unusedFootnotes = allFootNotes.filter(
    (item) => !categories.some((category) => category.claims.some((claim) => claim.sources.some((source) => source.pos === item.pos)))
  );
  if (unusedFootnotes.length) {
    console.error("UNUSED FOOTNOTE FOUND", unusedFootnotes);
  }
  return { summary: categories, footnotes: allFootNotes, unusedFootnotes };
}

function parseCitations(line: string): { text: string; citations: number[] } {
  // account for different citation styles
  // text [1,2,3]
  // text [1, 2, 3]
  // text [1][2][3]
  // text [1] [2] [3]
  // text [1],[2],[3]
  // text [1], [2], [3]
  const match = line.trim().match(/^(.*?)((\[((\d|,|\s)+)\],?\s*)+)$/);
  if (!match) {
    return { text: line.trim(), citations: [] };
  }

  // regex, replace anything that is not a digit with space
  const citations = (match[2] ?? "")
    .replaceAll(/[^\d]/g, " ")
    .split(" ")
    .map((item) => parseInt(item))
    .filter(Boolean);

  const text = match[1].trim();

  return {
    text,
    citations,
  };
}
