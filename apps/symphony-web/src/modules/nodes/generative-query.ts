import { OperatorNode } from "@symphony/types";
import { RunContext } from "../../main";
import { jqAutoPrompt } from "../data-frame/jq-auto-prompt";
import { tapAndLog } from "../log/tap-and-log";
import { ChatMessage } from "../openai/chat";
import { printJsonTyping, sampleJsonContent } from "../reflection/json-reflection";

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

  await jqAutoPrompt({
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
${tapAndLog("[jq/interface]", printJsonTyping(dataFrame))}
\`\`\`

Sample input:
\`\`\`json
${JSON.stringify(tapAndLog("[jq/sample json]", sampleJsonContent(dataFrame)), null, 2)}
\`\`\`

The user will provide a query goal. You need to infer the data processing task. Based on the task, use jq to shape the input into a flat json array. So user can perform the task on the array.
Make sure all the fields on the array are needed for the task.

Response format:

${responseTemplate}`,
  })
    .then((collectionData) => {})
    .catch((e: any) => {
      runContext.figmaProxy.notify({
        setOperatorData: {
          id: operator.id,
          data: `${e?.name} ${e?.message}`,
        },
      });
    });
}
