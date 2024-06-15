import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { Subject, last, mergeScan, tap } from "rxjs";
import { synthesizeStream, type SyntheticFinding } from "../../inference/synthesize-stream";
import type { ChatCompletionStreamProxy } from "../../max/use-max-proxy";
import { contentNodestoIdContentNode, getItemId, getItemText, type IdContentNode } from "../../object-tree/content-nodes-to-id-content-node";
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

      let progress = 0;
      proxyToFigma.notify({ showNotification: { message: `Synthesizing...`, config: { timeout: Infinity }, cancelButton: { handle } } });

      const $render = new Subject<SyntheticFinding<IdContentNode>>();

      $render
        .pipe(
          mergeScan(
            async (previousIds, finding) => {
              const previousId = previousIds.at(-1);
              const { mutationResponse } = await proxyToFigma.request({
                mutationRequest: {
                  position: previousId
                    ? {
                        relativeToNodes: {
                          ids: [previousId],
                        },
                      }
                    : {
                        viewportCenter: {},
                      },
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

              proxyToFigma.notify({
                showNotification: { message: `Synthesizing... ${++progress} findings`, config: { timeout: Infinity }, cancelButton: { handle } },
              });

              return [...previousIds, sectionId];
            },
            [] as string[],
            1
          ),
          last(),
          tap((allIds) => {
            proxyToFigma.notify({
              showNotification: {
                message: `✅ Synthesizing... done. ${allIds.length - 1} findings`,
                config: { timeout: Infinity },
                locateButton: {
                  ids: allIds,
                },
              },
            });

            proxyToFigma.notify({ setSelection: allIds });
          })
        )
        .subscribe();

      try {
        await synthesizeStream({
          chatStreamProxy: chatStream,
          items: contentNodestoIdContentNode(input)
            .filter((input) => input.content.trim())
            .sort(() => Math.random() - 0.5),
          goalOrInstruction: args["goalOrInstruction"],
          onStringify: getItemText,
          abortSignal: abortController.signal,
          onFinding: (finding) => $render.next(finding),
        });
      } finally {
        $render.complete();
      }
    },
  };
}
