import type { MessageToFigma, MessageToWeb, MutationRequest } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { synthesize } from "../../inference/synthesize";
import { contentNodestoIdStickies, getItemId, getItemText } from "../../object-tree/content-nodes-to-id-stickies";
import type { FnCallProxy } from "../../openai/proxy";
import type { Tool } from "../tool";
import { setSpinner } from "../utils/spinner";

export function synthesizeTool(fnCallProxy: FnCallProxy, proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>): Tool {
  return {
    id: "core.synthesize",
    displayName: "Synthesize",
    parameters: [
      {
        displayName: "Each item is",
        key: "itemType",
        hint: "an interview note",
        isOptional: true,
      },
    ],
    getActions: () => ["Run"],
    run: async ({ input, args, action }) => {
      const stopSpinner = setSpinner((notification) => proxyToFigma.notify({ showNotification: notification }), "Synthesizing");

      try {
        const response = await synthesize(
          fnCallProxy,
          contentNodestoIdStickies(input).filter((input) => input.content.trim()),
          args["itemType"],
          getItemText
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
