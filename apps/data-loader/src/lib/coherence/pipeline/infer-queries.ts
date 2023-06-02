import type { SimpleChatProxy } from "../../azure/chat";
import { responseToList } from "../../hits/format";
import { type SemanticSearchProxy } from "../../hits/search-claims";
import { semanticSearch } from "./semantic-search";

export async function getSemanticQueries(chatProxy: SimpleChatProxy, markdownFile: string) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content: `You are a researcher assistant. The user will provide a document. You must generate a list of 20 semantic search queries for any evidence that supports or contradicts the document. Cover as many different angles as possible. Respond in bullet list. Use format:
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

// This is a WIP
// Facepile, Main detail, Rich Text Editor, Shimmer, and Spin button can be used to test the effectiveness of this technique
export async function queryByNames(searchProxy: SemanticSearchProxy, names: string[]) {
  // generate concept name-only based queries
  const results = (await Promise.all(names.map(async (name) => await semanticSearch(searchProxy, `"${name}" pattern`, 10, 1.3)))).sort(
    (a, b) => b.maxScore - a.maxScore
  );
  return results;
}
