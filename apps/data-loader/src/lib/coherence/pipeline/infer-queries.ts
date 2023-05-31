import type { SimpleChatProxy } from "../../azure/chat";
import { responseToList } from "../../hits/format";

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
