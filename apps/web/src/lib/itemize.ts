import { JSONParser } from "@streamparser/json";
import OpenAI from "openai";
import type { ResponseInputImage } from "openai/resources/responses/responses.mjs";
import { last, mergeScan, Subject, tap } from "rxjs";
import { ensureApiKey, getApiKey } from "./api-key";
import { contentNodesToIdContentNode, getFlatNodes, getItemId, getItemText, type IdContentNode } from "./object-tree";
import { proxyToFigma } from "./proxy";
import { ensureSelection, selection$ } from "./selection";
import { createTask } from "./task";
import { ensureTokenLimit } from "./tokenizer";

export async function runItemize() {
  const apiKey = ensureApiKey(getApiKey());
  const selection = ensureSelection(selection$.value);
  const itemsOfInput = document.querySelector<HTMLTextAreaElement>(`[name="itemize-instruction"]`);
  const itemsOf = [itemsOfInput?.value, itemsOfInput?.placeholder].filter(Boolean).at(0);
  if (!itemsOf) {
    proxyToFigma.notify({ showNotification: { message: "Itemization is missing objective", config: { error: true } } });
    throw new Error("Itemization is missing objective");
  }

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey,
  });

  const { handle, abortController } = createTask();
  let progress = 0;
  proxyToFigma.notify({ showNotification: { message: `Itemizing...`, config: { timeout: Infinity }, cancelButton: { handle } } });

  const createdSections: { id: string; name: string }[] = [];

  const $render = new Subject<SyntheticItem<IdContentNode>>();
  $render
    .pipe(
      mergeScan(
        async (_prev, finding) => {
          const existingSection = createdSections.find((section) => section.name === finding.sectionName)?.id;
          if (!existingSection) {
            const { mutationResponse } = await proxyToFigma.request({
              mutationRequest: {
                position: createdSections.length ? { relativeToNodes: { ids: [createdSections.at(-1)!.id] } } : { viewportCenter: {} },
                createSections: [{ name: finding.sectionName }],
              },
            });

            const sectionId = mutationResponse?.createdSections[0];
            if (!sectionId) throw new Error("Failed to create section");
            createdSections.push({ id: sectionId, name: finding.sectionName });
          }

          // Now we can guarantee that the section exists
          const existingSectionId = createdSections.find((section) => section.name === finding.sectionName)!.id;

          const sourceNodeType = getFlatNodes(selection).find((node) => node.id === finding.source.id)?.type;
          const canClone = sourceNodeType === "sticky";

          const cloneNodes = canClone ? (finding.sectionName === "Unused" ? [getItemId(finding.source)] : undefined) : undefined;
          const cloneAndUpdateNodes = canClone
            ? finding.sectionName !== "Unused"
              ? [{ id: getItemId(finding.source), content: finding.text }]
              : undefined
            : undefined;
          const createNodes = canClone ? undefined : [finding.text];

          await proxyToFigma.request({
            mutationRequest: {
              updateSections: [
                {
                  id: existingSectionId,
                  ...(cloneNodes ? { cloneNodes } : {}),
                  ...(cloneAndUpdateNodes ? { cloneAndUpdateNodes } : {}),
                  ...(createNodes ? { createNodes } : {}),
                  flowDirection: "vertical",
                },
              ],
            },
          });

          proxyToFigma.notify({
            showNotification: { message: `Itemizing... ${++progress} items`, config: { timeout: Infinity }, cancelButton: { handle } },
          });

          return _prev;
        },
        [] as string[],
        1
      ),
      last(),
      tap(async (allIds) => {
        proxyToFigma.notify({
          showNotification: {
            message: `✅ Itemizing... done. ${progress} items`,
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
    const items = await contentNodesToIdContentNode(selection);
    await itemizeStream({
      openai,
      items: items.filter((input) => input.content.trim()),
      itemsOf,
      onStringify: getItemText,
      attachments: items.flatMap((item) => item.attachments ?? []),
      abortSignal: abortController.signal,
      onItem: (finding) => $render.next(finding),
    });
  } finally {
    $render.complete();
  }

  return;
}

export interface SyntheticItem<T> {
  sectionName: string;
  text: string;
  source: T;
}

export interface ItemizeStreamOptions<T> {
  openai: OpenAI;
  items: T[];
  attachments?: {
    mimeType: string;
    dataUrl: string;
  }[];
  itemsOf: string;
  onStringify: (item: T) => string;
  abortSignal?: AbortSignal;
  onItem?: (item: SyntheticItem<T>) => any;
  onUnused?: (items: T[]) => any;
}

export async function itemizeStream<T>({
  openai,
  items,
  attachments,
  itemsOf,
  onStringify,
  abortSignal,
  onItem,
}: ItemizeStreamOptions<T>): Promise<SyntheticItem<T>[]> {
  const itemsWithIds = items.map((item, index) => ({ id: index + 1, data: onStringify(item) }));
  const originalItems = items.map((item, index) => ({ id: index + 1, data: item }));

  const itemsYaml = itemsWithIds
    .map((item) =>
      `
[id: ${item.id}]
${item.data}`.trim()
    )
    .join("\n\n");

  const safeCount = ensureTokenLimit(10_000, itemsYaml);
  console.log({ safeCount });

  const result = await openai.responses.create(
    {
      stream: true,
      model: "gpt-4.1",
      text: { format: { type: "json_object" } },
      temperature: 0.2,
      input: [
        {
          role: "system",
          content: `
Find the ${itemsOf} in the provided objects. Each object may have 0, 1, or multiple findings.

Respond in JSON format of this type

type Response = {
  results: {
    sourceId: number, // id of the sticky note
    findings: string[], // find the ${itemsOf} in the source, may be empty
  }[]
}
          `.trim(),
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Find ${itemsOf} from the following objects:
${itemsYaml}
          `.trim(),
            },

            ...(attachments?.length
              ? attachments
                  .filter((attachment) => attachment.mimeType.startsWith("image/"))
                  .map(
                    (attachment) =>
                      ({
                        detail: "auto" as const,
                        type: "input_image" as const,
                        image_url: attachment.dataUrl,
                      } satisfies ResponseInputImage)
                  )
              : []),
          ],
        },
      ],
    },
    {
      signal: abortSignal,
    }
  );

  const parser = new JSONParser();
  const usedIds = new Set<number>();
  const parsingTask = Promise.withResolvers<SyntheticItem<T>[]>();
  const syntheticItems: SyntheticItem<T>[] = [];

  parser.onValue = (v) => {
    const syntheticItem = parseItem(v?.value);
    if (syntheticItem && syntheticItem.sourceId && syntheticItem.items.length) {
      usedIds.add(syntheticItem.sourceId);
      const sourceItem = originalItems.find((item) => item.id === syntheticItem.sourceId);
      if (sourceItem) {
        const mappedItems = syntheticItem.items.map((item) => ({ sectionName: itemsOf, text: item, source: sourceItem.data }));
        syntheticItems.push(...mappedItems);
        mappedItems.forEach((item) => onItem?.(item));
      }
    }
  };

  parser.onEnd = () => {
    const unusedItems = originalItems
      .filter((item) => !usedIds.has(item.id))
      .map((item) => ({
        sectionName: "Unused",
        text: "",
        source: item.data,
      }));

    unusedItems.forEach((item) => onItem?.(item));
    console.log("Unused items:", unusedItems);

    parsingTask.resolve(syntheticItems);
    console.log("parser ended");
  };

  for await (const response of result) {
    if (response.type === "response.output_text.delta") {
      const chunkText = response.delta;
      if (chunkText) parser.write(chunkText);
    }
  }

  return await parsingTask.promise;
}

interface ParsedItem {
  sourceId: number;
  items: string[];
}
function parseItem(value?: any): ParsedItem | null {
  if (
    Object.getOwnPropertyNames(value as {})
      .sort()
      .join(",") === "findings,sourceId"
  ) {
    if (typeof value.sourceId !== "number") throw new Error("Expected sticky note id to be number");
    if (!Array.isArray(value.findings)) throw new Error("Expected findings to be an array");
    if (!value.findings.every((item: any) => typeof item === "string")) throw new Error("Expected findings to be an array of strings");

    return {
      sourceId: value.sourceId as number,
      items: value.findings as string[],
    };
  } else {
    return null;
  }
}
