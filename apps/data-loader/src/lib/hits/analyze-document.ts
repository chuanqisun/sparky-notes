import { readFile, readdir } from "fs/promises";
import { getSimpleChatProxy, type SimpleChatProxy } from "../azure/chat";

export async function analyzeDocument(dir: string) {
  const chatProxy = getSimpleChatProxy(process.env.OPENAI_API_KEY!, "v3.5-turbo");
  const documentToClaims = getClaims.bind(null, chatProxy);

  const filenames = await readdir(dir);
  await Promise.all(
    filenames.map(async (filename, i) => {
      if (i > 0) return;

      const markdownFile = await readFile(`${dir}/${filename}`, "utf-8");
      const claims = await documentToClaims(markdownFile);

      console.log(claims);
    })
  );
}

async function getClaims(chatProxy: SimpleChatProxy, markdownFile: string) {
  const claims = await chatProxy({
    messages: [
      { role: "system", content: markdownFile },
      {
        role: "user",
        content: "The user will provide a document that contains claims. You must think critically and identify the list of claims from the document.",
      },
    ],
    max_tokens: 300,
    temperature: 0,
  });

  return claims.choices[0].message.content ?? "";
}
