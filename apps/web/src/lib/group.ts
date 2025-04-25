import { JSONParser } from "@streamparser/json";
import OpenAI from "openai";
import { last, mergeScan, Subject, tap } from "rxjs";
import { ensureApiKey, getApiKey } from "./api-key";
import { contentNodesToIdContentNode, getItemId, getItemText, type IdContentNode } from "./object-tree";
import { proxyToFigma } from "./proxy";
import { ensureSelection, selection$ } from "./selection";
import { createTask } from "./task";
import { ensureTokenLimit } from "./tokenizer";

export async function runGroup() {
  const apiKey = ensureApiKey(getApiKey());
  const selection = ensureSelection(selection$.value);
  const groupingGoalInput = document.querySelector<HTMLTextAreaElement>(`[name="group-instruction"]`);
  const groupingGoal = [groupingGoalInput?.value, groupingGoalInput?.placeholder].filter(Boolean).at(0);
  if (!groupingGoal) {
    proxyToFigma.notify({ showNotification: { message: "Group goal is missing value", config: { error: true } } });
    throw new Error("Group goal is missing value");
  }

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey,
  });

  const { handle, abortController } = createTask();
  let progress = 0;
  proxyToFigma.notify({ showNotification: { message: `Grouping...`, config: { timeout: Infinity }, cancelButton: { handle } } });

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
            showNotification: { message: `Grouping... ${++progress} groups`, config: { timeout: Infinity }, cancelButton: { handle } },
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
            message: `✅ Grouping... done. ${allIds.length - 1} groups`,
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
      openai,
      items: contentNodesToIdContentNode(selection)
        .filter((input) => input.content.trim())
        .sort(() => Math.random() - 0.5),
      groupingGoal: groupingGoal,
      onStringify: getItemText,
      abortSignal: abortController.signal,
      onFinding: (finding) => $render.next(finding),
    });
  } finally {
    $render.complete();
  }

  return;
}

export const defaultContext = `Identify common themes across texts`;

export interface SyntheticFinding<T> {
  name: string;
  description: string;
  items: T[];
}

export interface SynthesizeStreamOptions<T> {
  openai: OpenAI;
  items: T[];
  groupingGoal: string;
  onStringify: (item: T) => string;
  abortSignal?: AbortSignal;
  onFinding?: (finding: SyntheticFinding<T>) => any;
}

export async function synthesizeStream<T>({
  openai,
  items,
  groupingGoal,
  onStringify,
  abortSignal,
  onFinding,
}: SynthesizeStreamOptions<T>): Promise<SyntheticFinding<T>[]> {
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
      temperature: 0.5,
      text: { format: { type: "json_object" } },
      input: [
        {
          role: "system",
          content: `
Affinitize sticky notes into groups. The goal is to discover and synthesize ${groupingGoal}
Each group should represent a single cohesive concept emerged from multiple sticky notes.
Ensure *2 or more* sticky notes per group

Respond in JSON format of this type

type Response = {
  groups: {
    name: string; // name of the group
    description: string; // one sentence description 
    stickyNoteIds: number[]; // ids of the sticky notes that contributed to this group
  }[]
}
          `.trim(),
        },
        {
          role: "user",
          content: `
Discover and synthesize ${groupingGoal} from the following sticky notes:
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
  const parsingTask = Promise.withResolvers<SyntheticFinding<T>[]>();
  const syntheticFindings: SyntheticFinding<T>[] = [];

  parser.onValue = (v) => {
    const syntheticFinding = parseFinding(v?.value);
    if (syntheticFinding) {
      const sourceItems = syntheticFinding.stickyNoteIds.map((id) => {
        usedIds.add(id);
        return originalItems.find((item) => item.id === id)!.data;
      });

      const mappedFinding = { name: syntheticFinding.name, description: syntheticFinding.description, items: sourceItems };
      syntheticFindings.push(mappedFinding);
      onFinding?.(mappedFinding);
    }
  };

  parser.onEnd = () => {
    const unusedItems = originalItems.filter((item) => !usedIds.has(item.id));
    if (unusedItems.length) {
      const unusedFinding = {
        name: "Unused",
        description: "Items not referenced in any finding",
        items: unusedItems.map((item) => item.data),
      };

      syntheticFindings.push(unusedFinding);
      onFinding?.(unusedFinding);
    }

    parsingTask.resolve(syntheticFindings);
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

interface ParsedFinding {
  name: string;
  description: string;
  stickyNoteIds: number[];
}
function parseFinding(value?: any): ParsedFinding | null {
  if (
    Object.getOwnPropertyNames(value as {})
      .sort()
      .join(",") === "description,name,stickyNoteIds"
  ) {
    if (typeof value.name !== "string") throw new Error("Expected name string in finding");
    if (typeof value.description !== "string") throw new Error("Expected description string in finding");
    if (!Array.isArray(value.stickyNoteIds)) throw new Error("Expected stickyNoteIds array in finding");
    if (!value.stickyNoteIds.every((id: any) => typeof id === "number")) throw new Error("Expected number in stickyNoteIds array");

    return {
      name: value.name as string,
      description: value.description as string,
      stickyNoteIds: value.stickyNoteIds as number[],
    };
  } else {
    return null;
  }
}
