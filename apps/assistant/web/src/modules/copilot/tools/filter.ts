import type { MessageToFigma, MessageToWeb, MutationRequest } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { filter } from "../../inference/filter";
import { contentNodestoIdStickies, getItemText } from "../../object-tree/content-nodes-to-id-stickies";
import type { FnCallProxy } from "../../openai/proxy";
import type { Tool } from "../tool";
import { setSpinner } from "../utils/spinner";

export function filterTool(fnCallProxy: FnCallProxy, proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>): Tool {
  return {
    id: "core.filter",
    displayName: "Filter",
    parameters: [
      {
        displayName: "Condition",
        key: "predicate",
        hint: "is a household object",
        isOptional: true,
      },
    ],
    getActions: () => ["Run"],
    run: async ({ input, args }) => {
      const stopSpinner = setSpinner((notification) => proxyToFigma.notify({ showNotification: notification }), "Filtering");

      const predicate = args["predicate"];

      try {
        const mutationRequest: MutationRequest = {
          createSections: [
            {
              name: `✅ True to "${predicate}"`,
            },
            {
              name: `❌ False to "${predicate}"`,
            },
            {
              name: "Error",
            },
          ],
        };

        const { mutationResponse } = await proxyToFigma.request({ mutationRequest });
        if (mutationResponse?.createdSections.length !== 3) return;

        const [acceptedContainer, rejectedContainer, errorsContaienr] = mutationResponse.createdSections;

        const filterResults = await filter(fnCallProxy, args["predicate"], getItemText, contentNodestoIdStickies(input), {
          onAccept: (item) =>
            proxyToFigma.request({
              mutationRequest: {
                updateSections: [
                  {
                    id: acceptedContainer,
                    moveStickies: [item.id],
                  },
                  {
                    id: rejectedContainer,
                  },
                  {
                    id: errorsContaienr,
                  },
                ],
              },
            }),
          onReject: (item) =>
            proxyToFigma.request({
              mutationRequest: {
                updateSections: [
                  {
                    id: acceptedContainer,
                  },
                  {
                    id: rejectedContainer,
                    moveStickies: [item.id],
                  },
                  {
                    id: errorsContaienr,
                  },
                ],
              },
            }),

          onError: (item) =>
            proxyToFigma.request({
              mutationRequest: {
                updateSections: [
                  {
                    id: acceptedContainer,
                  },
                  {
                    id: rejectedContainer,
                  },
                  {
                    id: errorsContaienr,
                    moveStickies: [item.id],
                  },
                ],
              },
            }),
        });

        if (!filterResults.errors.length) {
          // empty mutation just to align the items
          await proxyToFigma.request({
            mutationRequest: {
              removeSections: [errorsContaienr],
              updateSections: [
                {
                  id: acceptedContainer,
                },
                {
                  id: rejectedContainer,
                },
              ],
            },
          });
        }

        stopSpinner();
      } finally {
        stopSpinner();
      }
    },
  };
}
