import { assert } from "console";
import { mkdir, readFile, readdir, writeFile } from "fs/promises";
import { getSimpleChatProxy, type SimpleChatProxy } from "../azure/chat";
import { EntityName } from "./entity";
import { responseToList } from "./format";
import { getClaimIndexProxy, getSemanticSearchInput } from "./search-claims";

export async function analyzeDocument(dir: string, outDir: string) {
  assert(process.env.OPENAI_API_KEY, "OPENAI_API_KEY is required");
  assert(process.env.HITS_UAT_SEARCH_API_KEY, "HITS_UAT_SEARCH_API_KEY is required");

  mkdir(outDir, { recursive: true });

  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");
  const claimSearchProxy = getClaimIndexProxy(process.env.HITS_UAT_SEARCH_API_KEY!);
  const documentToClaims = getSemanticQueries.bind(null, chatProxy);

  const filenames = await readdir(dir);
  await Promise.all(
    filenames.map(async (filename, i) => {
      const markdownFile = await readFile(`${dir}/${filename}`, "utf-8");
      const claims = await documentToClaims(markdownFile);
      console.log(claims);
      const queries = responseToList(claims).listItems;

      const rankedResults: { query: string; responses: { title: string; score: number; caption: string }[] }[] = [];

      for (const query of queries) {
        console.log(`Query: ${query}`);

        const result = await claimSearchProxy(getSemanticSearchInput(query, 10));
        const responses = result.value
          ?.filter((doc) => doc["@search.rerankerScore"] > 1)
          ?.map((doc) => ({
            title: doc.ClaimTitle,
            score: doc["@search.rerankerScore"],
            claimUrl: `https://hits.microsoft.com/${EntityName[doc.ClaimType]}/${doc.ClaimId}`,
            caption: doc["@search.captions"].map((item) => item.text).join("..."),
          }));

        rankedResults.push({ query, responses: responses ?? [] });
      }

      const aggregated = rankedResults
        .map((item) => item.responses)
        .flat()
        .filter((item, index, arr) => arr.findIndex((i) => i.title === item.title) === index)
        .sort((a, b) => b.score - a.score);

      // TODO add a filter step to ensure mentioning of the component name
      // TODO add token limit and chunking to long document

      await writeFile(`${outDir}/${filename}.json`, JSON.stringify(rankedResults, null, 2));
      await writeFile(`${outDir}/${filename}-aggregated.json`, JSON.stringify(aggregated, null, 2));
    })
  );
}

async function getSemanticQueries(chatProxy: SimpleChatProxy, markdownFile: string) {
  const claims = await chatProxy({
    messages: [
      {
        role: "system",
        content:
          "You are a researcher assisant. The user will provide a document. You must generate a list of 10 semantic search queries for any evidence that supports or contradicts the document. Respond in bullet list",
      },
      { role: "user", content: markdownFile },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  return claims.choices[0].message.content ?? "";
}
