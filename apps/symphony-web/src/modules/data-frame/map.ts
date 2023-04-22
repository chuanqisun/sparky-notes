import GPT3Tokenizer from "gpt3-tokenizer";
import { getChunks, randomSampleArrayItems } from "../../utils/array";
import { tapAndLog } from "../log/tap-and-log";
import { ChatMessage } from "../openai/chat";
import { printJsonTyping, sampleJsonContent } from "../reflection/json-reflection";

export interface MapConfig {
  dataFrame: any;
  query: string;
  onGetDesignerChat: (messages: ChatMessage[]) => Promise<string>;
  onGetMapperChat: (messages: ChatMessage[]) => Promise<string>;
  onShouldAbort?: () => boolean;
}

export async function map(config: MapConfig) {
  const { dataFrame, query, onGetDesignerChat, onGetMapperChat } = config;

  if (!Array.isArray(dataFrame)) throw new Error("The input must be an array");

  // step 1 design output schema
  const schemaDesignMessages: ChatMessage[] = [
    {
      role: "system",
      content: `
    You are an expert in analyzing data in json. The input is a json array defined by the following type
\`\`\`typescript
${tapAndLog("[map/input interface design]", printJsonTyping(dataFrame))}
\`\`\`

Sample input:
\`\`\`json
${JSON.stringify(tapAndLog("[jq/sample json]", sampleJsonContent(dataFrame)), null, 2)}
\`\`\`

The user will provide a query goal, and you will analyze the data and design a json structure that best fits the goal.

Use this format:

Reason: <Analyze the user goal and input>
Output type: 
\`\`\`typescript
<The typescript interface that represents the output>
\`\`\``,
    },
    { role: "user", content: query },
  ];

  const responseTemplate = await onGetDesignerChat(schemaDesignMessages);

  const interfacePattern = responseTemplate.match(/^\`\`\`typescript((.|\s)+?)\`\`\`/m)?.[0].trim();
  if (!interfacePattern) throw new Error("Error designing solution format");

  console.log("[map/output interface design]", interfacePattern);

  // step 2 divide and conquer
  // estimate token density per item
  const actualSampleCount = Math.min(10, dataFrame.length);
  const samples = randomSampleArrayItems(dataFrame, actualSampleCount);
  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  const tokenCount = tokenizer.encode(JSON.stringify(samples, null, 2)).bpe.length;
  const tokenDensity = tokenCount / actualSampleCount;

  console.log("[map/token density]", tokenDensity);

  const targetTokenCountPerChunk = 500;
  const chunkSize = Math.ceil(targetTokenCountPerChunk / tokenDensity);
  const chunks = getChunks(dataFrame, chunkSize);

  console.log("[map/chunked]", chunks);

  // step 3 map over chunks
  const getMapMessages: (collectionData: any[]) => ChatMessage[] = (collectionData) => [
    {
      role: "system",
      content: `
    You are an expert in analyzing data in json. You will perform a query provided by the user to map the data from the input type to the output type.
Input type:
\`\`\`typescript
${printJsonTyping(dataFrame)}
\`\`\`

Input data:
\`\`\`json
${JSON.stringify(collectionData, null, 2)}
\`\`\`

Output type:
\`\`\`typescript
${printJsonTyping(dataFrame)}
\`\`\`

Respond in this format:

Plan: <Describe the analysis task needed to map the input to the output>
Output: 
\`\`\`json
<The json object>
\`\`\``,
    },
    { role: "user", content: query },
  ];

  const chunkResponses: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[map/start chunk] ${i + 1}/${chunks.length}`);
    const chunkResponse = await onGetMapperChat(getMapMessages(chunks[i]));
    const outputObjectString = chunkResponse.match(/^\`\`\`json((.|\s)+?)\`\`\`/m)?.[1].trim() ?? "[]";

    // TODO add auto prompt engineering with just 1 item
    // TODO perf hack: use id to correlate. No need to repeat the input text?
    // TODO handle error
    const outputObject = JSON.parse(outputObjectString);

    console.log(`[map/finished chunk] ${i + 1}/${chunks.length}`, outputObject);
    chunkResponses.push(outputObject);
  }

  const flatResults = chunkResponses.flat();

  console.log("[map/complete]", flatResults);

  return flatResults;
}
