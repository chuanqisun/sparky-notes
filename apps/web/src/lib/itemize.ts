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

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey,
  });

  const defaultItemsOf = "key points";

  const { handle, abortController } = createTask();
  let progress = 0;
  proxyToFigma.notify({ showNotification: { message: `Itemizing...`, config: { timeout: Infinity }, cancelButton: { handle } } });

  // create the initial group container
  const { mutationResponse } = await proxyToFigma.request({
    mutationRequest: {
      position: {
        viewportCenter: {},
      },
      createSections: [
        {
          name: `Itemized ${defaultItemsOf}`,
        },
      ],
    },
  });

  const outputSectionId = mutationResponse?.createdSections[0];
  if (!outputSectionId) {
    proxyToFigma.notify({ showNotification: { message: "Failed to create section", config: { error: true } } });
    throw new Error("Failed to create section");
  }

  const $render = new Subject<SyntheticItem<IdContentNode>>();
  $render
    .pipe(
      mergeScan(
        async (_prev, finding) => {
          await proxyToFigma.request({
            mutationRequest: {
              updateSections: [
                {
                  id: outputSectionId,
                  cloneAndUpdateNodes: [
                    {
                      id: getItemId(finding.source),
                      content: finding.text,
                    },
                  ],
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
            message: `✅ Itemizing... done. ${allIds.length - 1} items`,
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
      items: contentNodesToIdContentNode(selection)
        .filter((input) => input.content.trim())
        .sort(() => Math.random() - 0.5),
      itemsOf: defaultItemsOf, // TODO wireup with UI input
      onStringify: getItemText,
      abortSignal: abortController.signal,
      onItem: (finding) => $render.next(finding),
      onUnused: async (unusedItems) => {
        // TODO render unused items
        await proxyToFigma.request({
          mutationRequest: {
            position: {
              relativeToNodes: {
                ids: [outputSectionId],
              },
            },
            createSections: [
              {
                name: "Unused",
                cloneNodes: unusedItems.map(getItemId),
                flowDirection: "vertical",
              },
            ],
          },
        });
      },
    });
  } finally {
    $render.complete();
  }

  return;
}

export interface SyntheticItem<T> {
  text: string;
  source: T;
}

export interface ItemizeStreamOptions<T> {
  openai: OpenAI;
  items: T[];
  itemsOf: string | undefined;
  onStringify: (item: T) => string;
  abortSignal?: AbortSignal;
  onItem?: (item: SyntheticItem<T>) => any;
  onUnused?: (items: T[]) => any;
}

export async function itemizeStream<T>({
  openai,
  items,
  itemsOf,
  onStringify,
  abortSignal,
  onItem,
  onUnused,
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
      model: "gpt-4o",
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "system",
          content: `
Itemize the ${itemsOf} from the input. Each source may have 0, 1, or multiple items.

Respond in JSON format like this:
"""
{
  "items": [
    {
      "text": "<one sentence description of this item>",
      "source": <id_number>
    },
    ...
  ]
}
"""
          `.trim(),
        },
        {
          role: "user",
          content: `
${itemsOf?.trim().length ? itemsOf : "Key points"}

Source:
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
    if (syntheticItem && syntheticItem.source) {
      usedIds.add(syntheticItem.source);
      const sourceItem = originalItems.find((item) => item.id === syntheticItem.source);
      if (sourceItem) {
        const mappedItem = { text: syntheticItem.text, source: sourceItem.data };
        syntheticItems.push(mappedItem);
        onItem?.(mappedItem);
      }
    }
  };

  parser.onEnd = () => {
    const unusedItems = originalItems.filter((item) => !usedIds.has(item.id));
    if (unusedItems.length) {
      // TODO render unused items
      onUnused?.(unusedItems.map((item) => item.data));
      console.log("Unused items:", unusedItems);
    }

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
  text: string;
  source: number;
}
function parseItem(value?: any): ParsedItem | null {
  if (
    Object.getOwnPropertyNames(value as {})
      .sort()
      .join(",") === "source,text"
  ) {
    if (typeof value.text !== "string") throw new Error("Expected text string in finding");
    if (typeof value.source !== "number") throw new Error("Expected source number in finding");

    return {
      text: value.text as string,
      source: value.source as number,
    };
  } else {
    return null;
  }
}
