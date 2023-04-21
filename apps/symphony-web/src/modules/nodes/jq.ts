import { OperatorNode } from "@symphony/types";
import { promised } from "jq-web-wasm/jq.wasm";
import { RunContext } from "../../main";
import { ChatMessage } from "../openai/chat";
import { printJsonTyping, sampleJsonContent } from "../reflection/json-reflection";

export async function onRunJq(runContext: RunContext, operator: OperatorNode) {
  const { respondUpstreamOperators } = await runContext.figmaProxy.request({ requestUpstreamOperators: { currentOperatorId: operator.id } });

  if (!respondUpstreamOperators?.length) return;
  // current only current one parent
  const dataFrame = respondUpstreamOperators[0].data;

  const fileObject = JSON.parse(dataFrame);

  await iterateOnJqUntilSuccess(runContext, fileObject, operator.config, [])
    .then((result) => {
      runContext.figmaProxy.notify({
        setOperatorData: {
          id: operator.id,
          data: JSON.stringify(result),
        },
      });
    })
    .catch((e: any) => {
      runContext.figmaProxy.notify({
        setOperatorData: {
          id: operator.id,
          data: `${e?.name} ${e?.message}`,
        },
      });
    });
}

async function iterateOnJqUntilSuccess(
  runContext: RunContext,
  dataFrame: any,
  nlpQuery: string,
  previousMessage: ChatMessage[],
  lastError?: string
): Promise<any> {
  const userMessage: ChatMessage = {
    role: "user",
    content: lastError ? `The previous query failed with error: ${lastError}. Try a different query` : nlpQuery,
  };

  const typingInterface = printJsonTyping(dataFrame);
  const sampleContent = JSON.stringify(sampleJsonContent(dataFrame), null, 2);

  console.log({ typingInterface, sampleContent });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `
You are an expert in querying json with jq. The input is defined by the following type
\`\`\`typescript
${typingInterface}
\`\`\`

Sample input:
\`\`\`json
${sampleContent}
\`\`\`

The user will provide a query goal, and you will respond with the jq query. Use this format:

Reason: <Analyze user goal, input type, and any previous errors>
jq: '<query string surrounded by single quotes>'`,
    },
    ...previousMessage,
    userMessage,
  ];

  runContext.figmaProxy.notify({ showNotification: { message: `Designing query` } });
  const responseText = (await runContext.getChat(messages, { temperature: 0, model: "v4-8k", max_tokens: 800 })).choices[0].message.content ?? "";

  const jqString = responseText.match(/^jq\:\s*'(.+?)'/m)?.[1] ?? "";
  const normalizedTarget = dataFrame;
  if (!jqString) {
    throw new Error("Query planning error");
  }

  try {
    console.log("jq", jqString);
    console.log("jq input", normalizedTarget);
    runContext.figmaProxy.notify({ showNotification: { message: `Executing query ${jqString}` } });
    const result = await promised.json(normalizedTarget, jqString);
    console.log("jq output", result);
    return result;
  } catch (e: any) {
    if (previousMessage.length > 6) {
      throw new Error("Auto prompt engineering failed to converge");
    }

    const errorMessage = `${e?.name} ${e?.message} ${e?.stack}`;
    console.log(`jq error`, errorMessage);
    runContext.figmaProxy.notify({ showNotification: { message: `Revising query based on error message` } });

    return iterateOnJqUntilSuccess(runContext, dataFrame, nlpQuery, [...previousMessage, userMessage, { role: "system", content: responseText }], errorMessage);
  }
}
