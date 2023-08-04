import { OperatorNode } from "@symphony/types";
import { RunContext } from "../../main";
import { jqAutoPrompt } from "../data-frame/jq-auto-prompt";
import { map } from "../data-frame/map";
import { tapAndLog } from "../log/tap-and-log";
import { ChatMessage } from "../openai/chat";
import { jsonToTyping, sampleJsonContent } from "../reflection/json-reflection";

export async function onRunGenerativeQuery(runContext: RunContext, operator: OperatorNode) {
  const { respondUpstreamOperators } = await runContext.figmaProxy.request({ requestUpstreamOperators: { currentOperatorId: operator.id } });

  if (!respondUpstreamOperators?.length) return;
  // current only current one parent
  const parentData = respondUpstreamOperators[0].data;
  const nlpQuery = operator.config;

  const dataFrame = JSON.parse(parentData);

  const logAndNotify = (message: string) => {
    console.log(message);
    runContext.figmaProxy.notify({ showNotification: { message } });
  };

  try {
    const collectionData = await jqAutoPrompt({
      dataFrame,
      onGetChat: (messages: ChatMessage[]) =>
        runContext.getChat(messages, { max_tokens: 800, model: "v4-8k" }).then((res) => res.choices[0].message.content ?? ""),
      onGetUserMessage: ({ lastError }) => (lastError ? `The previous query failed with error: ${lastError}. Try a different query` : nlpQuery),
      onJqString: (jqString: string) => logAndNotify(`Executing query ${jqString}`),
      onRetry: (errorMessage: string) => logAndNotify(`Revising query based on error ${errorMessage}`),
      onShouldAbort: () => false, // TODO implement flow control
      onValidateResult: (result) => {
        if (!Array.isArray(result)) throw new Error("The result must be an array");
      },
      getSystemMessage: ({ dataFrame, responseTemplate }) => `
You are an expert in NLP data preparation in json with jq. The input is defined by the following type
\`\`\`typescript
${tapAndLog("[jq/interface]", jsonToTyping(dataFrame))}
\`\`\`

Sample input:
\`\`\`json
${JSON.stringify(tapAndLog("[jq/sample json]", sampleJsonContent(dataFrame)), null, 2)}
\`\`\`

The user will provide a query goal. You need to infer the data processing task. Based on the task, use jq to shape the input into a flat json array. So user can perform the task on the array.
Make sure all the fields on the array are needed for the task.

Response format:

${responseTemplate}`,
    });

    console.log(`[generative/collection ready]`, collectionData);

    const mapResults = await map({
      dataFrame: collectionData,
      query: nlpQuery,
      onGetDesignerChat: (messages) => runContext.getChat(messages, { max_tokens: 800, model: "v4-8k" }).then((res) => res.choices[0].message.content ?? ""),
      onGetMapperChat: (messages) =>
        runContext.getChat(messages, { max_tokens: 4000, model: "v3.5-turbo" }).then((res) => res.choices[0].message.content ?? ""),
      onProgress: (progress) =>
        runContext.figmaProxy.notify({
          showNotification: {
            message: `${progress.total - progress.success - progress.error} chunks left, ${progress.error} errors`,
            config: { timeout: Infinity },
          },
        }),
    });

    console.log(mapResults);
    runContext.figmaProxy.notify({
      setOperatorData: {
        id: operator.id,
        data: JSON.stringify(mapResults),
      },
    });
  } catch (e: any) {
    runContext.figmaProxy.notify({
      setOperatorData: {
        id: operator.id,
        data: `${e?.name} ${e?.message}`,
      },
    });
    throw e;
  }
}
