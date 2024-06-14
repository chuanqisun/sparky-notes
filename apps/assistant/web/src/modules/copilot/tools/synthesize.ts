import type { MessageToFigma, MessageToWeb } from "@h20/assistant-types";
import type { ProxyToFigma } from "@h20/figma-tools";
import { Subject, concatMap } from "rxjs";
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

      let refNodeId: null | string = null;
      let progress = 0;
      proxyToFigma.notify({ showNotification: { message: `Synthesizing...`, config: { timeout: Infinity }, cancelButton: { handle } } });

      const $render = new Subject<SyntheticFinding<IdContentNode>>();

      $render
        .pipe(
          concatMap(async (finding) => {
            const { mutationResponse } = await proxyToFigma.request({
              mutationRequest: {
                position: refNodeId
                  ? {
                      relativeToNodes: {
                        ids: [refNodeId],
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
            refNodeId = sectionId;

            proxyToFigma.notify({
              showNotification: { message: `Synthesizing... ${++progress} findings`, config: { timeout: Infinity }, cancelButton: { handle } },
            });
          })
        )
        .subscribe();

      try {
        const response = await synthesizeStream({
          chatStreamProxy: chatStream,
          items: contentNodestoIdContentNode(input)
            .filter((input) => input.content.trim())
            .sort(() => Math.random() - 0.5),
          goalOrInstruction: args["goalOrInstruction"],
          onStringify: getItemText,
          abortSignal: abortController.signal,
          onFinding: (finding) => $render.next(finding),
        });
        proxyToFigma.notify({ showNotification: { message: `✅ Synthesizing... done. ${response.length - 1} findings`, config: { timeout: Infinity } } });
      } finally {
        $render.complete();
      }
    },
  };
}
