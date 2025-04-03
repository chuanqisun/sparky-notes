import type { CreateSectionMutation, MessageToFigma, MessageToWeb, MutationRequest } from "@sticky-plus/figma-ipc-types";
import type { ProxyToFigma } from "@sticky-plus/figma-tools";
import { defaultCriteria, filter } from "../../inference/filter";
import { contentNodestoIdContentNode, getItemText } from "../../object-tree/content-nodes-to-id-content-node";
import { createTask } from "../abort";
import type { Tool } from "../tool";

export function filterTool(proxyToFigma: ProxyToFigma<MessageToFigma, MessageToWeb>): Tool {
  return {
    id: "core.filter",
    displayName: "Filter",
    parameters: [
      {
        displayName: "Goal or instruction",
        key: "predicate",
        hint: defaultCriteria,
        isOptional: true,
      },
    ],
    getActions: () => ["Run"],
    run: async ({ input, args }) => {
      const { handle, abortController } = createTask();

      proxyToFigma.notify({ showNotification: { message: `Filtering...`, config: { timeout: Infinity }, cancelButton: { handle } } });

      const mutationRequest: MutationRequest = {
        createSections: [
          {
            name: `✅ Accepted`,
          },
          {
            name: `❌ Rejected`,
          },
          {
            name: "Error",
          },
        ] as CreateSectionMutation[],
      };

      const resultContainers = [] as string[];
      try {
        const { mutationResponse } = await proxyToFigma.request({ mutationRequest });
        if (mutationResponse?.createdSections.length !== 3) return;

        const [acceptedContainer, rejectedContainer, errorsContaienr] = mutationResponse.createdSections;
        resultContainers.push(acceptedContainer, rejectedContainer, errorsContaienr);

        const filterResults = await filter({
          predicate: args["predicate"],
          getItemText,
          items: contentNodestoIdContentNode(input).filter((node) => node.content.trim()),
          abortSignal: abortController.signal,
          onAccept: (item) =>
            proxyToFigma.request({
              mutationRequest: {
                updateSections: [
                  {
                    id: acceptedContainer,
                    cloneNodes: [item.id],
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
                    cloneNodes: [item.id],
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
                    cloneNodes: [item.id],
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
      } finally {
        proxyToFigma.notify({ showNotification: { message: `Filtering...`, config: { timeout: Infinity }, cancelButton: { handle } } });

        proxyToFigma.notify({
          showNotification: {
            message: `✅ Filtering... done`,
            config: { timeout: Infinity },
            locateButton: {
              ids: resultContainers,
            },
          },
        });
      }
    },
  };
}
