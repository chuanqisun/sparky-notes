import GPT3Tokenizer from "gpt3-tokenizer";
import { getChunks, randomSampleArrayItems } from "../../utils/array";
import { tapAndLog } from "../log/tap-and-log";
import { ChatMessage } from "../openai/chat";
import { emitNode, getInterfaceTyping, getJsonAst, sampleJsonContent } from "../reflection/json-reflection";

export interface MapConfig {
  dataFrame: any;
  query: string;
  onGetDesignerChat: (messages: ChatMessage[]) => Promise<string>;
  onGetMapperChat: (messages: ChatMessage[]) => Promise<string>;
  onProgress?: (progress: { total: number; error: number; success: number }) => any;
  onShouldAbort?: () => boolean;
}

export async function map(config: MapConfig) {
  const { dataFrame, query, onGetDesignerChat, onGetMapperChat, onProgress } = config;

  if (!Array.isArray(dataFrame)) throw new Error("The input must be an array");
  if (!dataFrame.length) return [];

  const ast = getJsonAst(dataFrame[0], "item");
  const emitResult = emitNode(ast);

  // step 1 design output schema
  const schemaDesignMessages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a research assistant specializec in analyzing textual data in json. The input is a list of items. Each item is defined by the type \`${
        emitResult.valueType
      }\`:
\`\`\`typescript
${tapAndLog("[map/input item interface]", getInterfaceTyping(emitResult))}
\`\`\`

Sample input list:
${(sampleJsonContent(dataFrame) as any[]).map((sampleItem, index) => `Input ${index + 1}: ${JSON.stringify(sampleItem, null, 2)}`).join("\n")}

The user will provide a query goal, and you will design an output type for each item. Requirements:
1. The output type must be an object with a single key-value pair
2. The key must be descriptive of what the query is trying to achieve
3. The key must be different from the existing keys in the input
4. To save space, do not copy existing data into the result

Use this format:

Reason: <Analyze the user goal and input>
Output item type: 
\`\`\`typescript
<The typescript interface that represents the output>
\`\`\``,
    },
    { role: "user", content: query },
  ];

  const responseTemplate = await onGetDesignerChat(schemaDesignMessages);

  const interfacePattern = responseTemplate.match(/^\`\`\`typescript((.|\s)+?)\`\`\`/m)?.[1].trim();
  if (!interfacePattern) throw new Error("Error designing solution format");

  // step 2 divide and conquer
  // estimate token density per item
  const actualSampleCount = Math.min(10, dataFrame.length);
  const samples = randomSampleArrayItems(dataFrame, actualSampleCount);
  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  const tokenCount = tokenizer.encode(JSON.stringify(samples, null, 2)).bpe.length;
  const tokenDensity = tokenCount / actualSampleCount;

  console.log("[map/token density]", tokenDensity);

  // TODO prevent tail orphans in the chunks
  const targetTokenCountPerChunk = 1000;
  const chunkSize = Math.ceil(targetTokenCountPerChunk / tokenDensity);
  const chunks = getChunks(dataFrame, chunkSize);

  console.log("[map/chunked]", chunks);

  // step 3 map over chunks
  const getMapMessages: (collectionData: any[]) => ChatMessage[] = (collectionData) => [
    {
      role: "system",
      content: `You are a research assistant specializec in analyzing textual data in json. You will analyze each item in the input list best you can, and respond with is an output list.
Each input item is defined by the type \`${emitResult.valueType}\`:
\`\`\`typescript
${getInterfaceTyping(emitResult)}
\`\`\`

Each output item is defined by the type:
\`\`\`typescript
${interfacePattern}
\`\`\`
      
Input list:
${(collectionData as any[]).map((sampleItem, index) => `Input ${index + 1}: ${JSON.stringify(sampleItem, null, 2)}`).join("\n")}

The user will provide a query goal, and you will respond the Output list. Requirements:
1. Each input item must be mapped to exactly 1 output item
2. Output list must have exactly ${collectionData.length} items
3. Each output item must conform to the output type
4. Each output item must be valid JSON string
5. One line per output item.

Use this format:
Output 1: { "<key>": ... }
Output 2: { "<key>": ... }
...
`,
    },
    { role: "user", content: query },
  ];

  // TODO add auto prompt engineering with just 1 item
  // TODO handle error
  let successCount = 0;
  let errorCount = 0;

  const chunksResult = await Promise.all(
    chunks.map(async (chunk, index) => {
      const chunkResponse = await onGetMapperChat(getMapMessages(chunk));
      const outputItems = chunkResponse
        .split("\n")
        .filter((line) => line.toLocaleLowerCase().startsWith("output"))
        .map(
          (line) =>
            line
              .trim()
              .toLocaleLowerCase()
              .match(/^output\s*\d+\:\s*(.+)/)?.[1] ?? "{}"
        )
        .map((itemString) => {
          console.log("Mapped", itemString);
          try {
            return JSON.parse(itemString);
          } catch {
            return {};
          }
        });

      if (chunk.length !== outputItems.length) {
        console.log("The output list must have the same length as the input list, chunk discarded");
        onProgress?.({ total: chunks.length, error: ++errorCount, success: successCount });
        return [];
      }
      const mergedArray = chunk.map((inputItem, index) => ({ ...inputItem, ...outputItems[index] }));

      console.log(`[map/finished chunk] ${index + 1}`, mergedArray);
      onProgress?.({ total: chunks.length, error: errorCount, success: ++successCount });
      return mergedArray;
    })
  );

  const flatResults = chunksResult.flat();

  console.log("[map/complete]", flatResults);

  return flatResults;
}
