import type { MessageToFigma, MessageToWeb, MutationRequest } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { categorize } from "../../inference/categorize";
import { contentNodestoIdStickies, getItemId, getItemText } from "../../object-tree/content-nodes-to-id-stickies";
import type { FnCallProxy } from "../../openai/proxy";
import type { Tool } from "../tool";
import { setSpinner } from "../utils/spinner";

export function categorizeTool(fnCallProxy: FnCallProxy, proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>): Tool {
  return {
    id: "core.categorize",
    displayName: "Categorize",
    parameters: [],
    getActions: () => ["Run"],
    run: async ({ input, action }) => {
      const stopSpinner = setSpinner((notification) => proxyToFigma.notify({ showNotification: notification }), "Categorizing");

      try {
        const response = await categorize(fnCallProxy, contentNodestoIdStickies(input), getItemText);

        const groupedIds = response.map((group) => ({
          ...group,
          ids: group.items.map(getItemId),
        }));

        const mutation: MutationRequest = {
          createSections: groupedIds.map((group) => ({
            name: group.name,
            moveStickies: group.ids,
          })),
          showSuccessMessage: "✅ Categorizing done",
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
