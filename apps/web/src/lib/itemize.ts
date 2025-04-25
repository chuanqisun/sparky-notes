import { JSONParser } from "@streamparser/json";
import OpenAI from "openai";
import { last, mergeScan, Subject, tap } from "rxjs";
import { ensureApiKey, getApiKey } from "./api-key";
import { contentNodesToIdContentNode, getItemId, getItemText, type IdContentNode } from "./object-tree";
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

          await proxyToFigma.request({
            mutationRequest: {
              updateSections: [
                {
                  id: existingSectionId,
                  ...(finding.sectionName === "Unused"
                    ? {
                        cloneNodes: [getItemId(finding.source)],
                      }
                    : {
                        cloneAndUpdateNodes: [
                          {
                            id: getItemId(finding.source),
                            content: finding.text,
                          },
                        ],
                      }),
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
    await itemizeStream({
      openai,
      items: contentNodesToIdContentNode(selection).filter((input) => input.content.trim()),
      itemsOf,
      onStringify: getItemText,
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
  itemsOf: string;
  onStringify: (item: T) => string;
  abortSignal?: AbortSignal;
  onItem?: (item: SyntheticItem<T>) => any;
  onUnused?: (items: T[]) => any;
}

export async function itemizeStream<T>({ openai, items, itemsOf, onStringify, abortSignal, onItem }: ItemizeStreamOptions<T>): Promise<SyntheticItem<T>[]> {
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
  if (safeCount === 0) throw new Error("No input detected");
  console.log({ safeCount });

  const result = await openai.responses.create(
    {
      stream: true,
      model: "gpt-4o",
      text: { format: { type: "json_object" } },
      temperature: 0.2,
      input: [
        {
          role: "system",
          content: `
Itemize the ${itemsOf} in the provided sticky notes. Each sticky note may have 0, 1, or multiple items.

Respond in JSON format of this type

type Response = {
  results: {
    stickyNoteId: number, // id of the sticky note
    items: string[], // itemized ${itemsOf} from the sticky note, may be empty
  }[]
}
          `.trim(),
        },
        {
          role: "user",
          content: `
Itemize ${itemsOf} from the following sticky notes:
${itemsYaml}
          `.trim(),
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
    if (syntheticItem && syntheticItem.stickyNoteId && syntheticItem.items.length) {
      usedIds.add(syntheticItem.stickyNoteId);
      const sourceItem = originalItems.find((item) => item.id === syntheticItem.stickyNoteId);
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
  stickyNoteId: number;
  items: string[];
}
function parseItem(value?: any): ParsedItem | null {
  if (
    Object.getOwnPropertyNames(value as {})
      .sort()
      .join(",") === "items,stickyNoteId"
  ) {
    if (typeof value.stickyNoteId !== "number") throw new Error("Expected sticky note id to be number");
    if (!Array.isArray(value.items)) throw new Error("Expected items to be an array");
    if (!value.items.every((item: any) => typeof item === "string")) throw new Error("Expected items to be an array of strings");

    return {
      stickyNoteId: value.stickyNoteId as number,
      items: value.items as string[],
    };
  } else {
    return null;
  }
}
