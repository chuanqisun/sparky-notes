import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { synthesizeStream } from "../../inference/synthesize-stream";
import type { ChatCompletionStreamProxy } from "../../max/use-max-proxy";
import { contentNodestoIdStickies, getItemId, getItemText } from "../../object-tree/content-nodes-to-id-stickies";
import { createTask } from "../abort";
import type { Tool } from "../tool";

export function synthesizeTool(chatStream: ChatCompletionStreamProxy, proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>): Tool {
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

      const { mutationResponse } = await proxyToFigma.request({ mutationRequest: { createSections: [{ name: "Container" }] } });
      const containerId = mutationResponse?.createdSections[0];
      if (!containerId) throw new Error("Failed to create results container");

      let progress = 0;
      proxyToFigma.notify({ showNotification: { message: `Synthesizing...`, cancelButton: { handle } } });

      const response = await synthesizeStream({
        chatStreamProxy: chatStream,
        items: contentNodestoIdStickies(input)
          .filter((input) => input.content.trim())
          .sort(() => Math.random() - 0.5),
        goalOrInstruction: args["goalOrInstruction"],
        onStringify: getItemText,
        abortSignal: abortController.signal,
        onFinding: async (finding) => {
          const { mutationResponse } = await proxyToFigma.request({
            mutationRequest: {
              createSections: [
                {
                  name: finding.name,
                  createSummary: finding.description,
                  cloneNodes: finding.items.map(getItemId),
                  flowDirection: "vertical",
                },
              ],
            },
          });

          const sectionId = mutationResponse?.createdSections[0];
          if (!sectionId) throw new Error("Failed to create section");

          proxyToFigma.notify({ showNotification: { message: `Synthesizing... ${++progress} findings`, cancelButton: { handle } } });
          await proxyToFigma.request({
            mutationRequest: {
              updateSections: [
                {
                  id: containerId,
                  moveNodes: [sectionId],
                },
              ],
            },
          });
        },
      });

      // FIX ME: this does not render, race condition?
      proxyToFigma.notify({ showNotification: { message: `✅ Synthesizing... done. ${response.length - 1} findings` } });
    },
  };
}
