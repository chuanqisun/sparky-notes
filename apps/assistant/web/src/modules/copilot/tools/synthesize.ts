import type { MessageToFigma, MessageToWeb, MutationRequest } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { synthesizeStream } from "../../inference/synthesize-stream";
import type { ChatCompletionStreamProxy } from "../../max/use-max-proxy";
import { contentNodestoIdStickies, getItemId, getItemText } from "../../object-tree/content-nodes-to-id-stickies";
import type { Chat } from "../../openai/proxy";
import { createTask } from "../abort";
import type { Tool } from "../tool";
import { setSpinner } from "../utils/spinner";

export function synthesizeTool(chat: Chat, chatStream: ChatCompletionStreamProxy, proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>): Tool {
  return {
    id: "core.synthesize",
    displayName: "Synthesize",
    parameters: [
      {
        displayName: "Goal or instruction",
        key: "goalOrInstruction",
        hint: "Identify themes from texts",
        isOptional: true,
      },
    ],
    getActions: () => ["Run"],
    run: async ({ input, args, action }) => {
      const { handle, abortController } = createTask();

      const stopSpinner = setSpinner(
        (notification) => proxyToFigma.notify({ showNotification: { ...notification, cancelButton: { handle } } }),
        "Synthesizing..."
      );
      abortController.signal.addEventListener("abort", stopSpinner);

      try {
        const response = await synthesizeStream({
          chatStreamProxy: chatStream,
          items: contentNodestoIdStickies(input)
            .filter((input) => input.content.trim())
            .sort(() => Math.random() - 0.5),
          goalOrInstruction: args["goalOrInstruction"],
          onStringify: getItemText,
          abortSignal: abortController.signal,
          onFinding: (f) => console.log({ f }),
        });

        const groupedIds = response.map((group) => ({
          ...group,
          ids: group.items.map(getItemId),
        }));

        const mutation: MutationRequest = {
          createSections: groupedIds.map((group) => ({
            name: group.name,
            createSummary: group.description,
            moveStickies: group.ids,
          })),
          showSuccessMessage: "✅ Synthesizing done",
          showLocator: "Show results",
        };

        stopSpinner();

        await proxyToFigma.request({ mutationRequest: mutation });
      } finally {
        stopSpinner();
      }
    },
  };
}
