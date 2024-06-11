import type { MessageToFigma, MessageToWeb, MutationRequest } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { synthesize } from "../../inference/synthesize";
import { contentNodestoIdStickies, getItemId, getItemText } from "../../object-tree/content-nodes-to-id-stickies";
import type { Chat } from "../../openai/proxy";
import { createTask } from "../abort";
import type { Tool } from "../tool";
import { setSpinner } from "../utils/spinner";

export function synthesizeTool(chat: Chat,proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>): Tool {
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
        const response = await synthesize(
          chat,
          contentNodestoIdStickies(input)
            .filter((input) => input.content.trim())
            .sort(() => Math.random() - 0.5),
          args["goalOrInstruction"],
          getItemText,
          handle
        );

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
