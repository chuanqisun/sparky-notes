import { JSONParser } from "@streamparser/json";
import OpenAI from "openai";
import { last, mergeScan, Subject, tap } from "rxjs";
import { ensureApiKey, getApiKey } from "./api-key";
import { contentNodestoIdContentNode, getItemId, getItemText, type IdContentNode } from "./object-tree";
import { proxyToFigma } from "./proxy";
import { ensureSelection, selection$ } from "./selection";
import { createTask } from "./task";
import { ensureTokenLimit } from "./tokenizer";

export async function runGroup() {
  const apiKey = ensureApiKey(getApiKey());
  const selection = ensureSelection(selection$.value);

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
      openai,
      items: contentNodestoIdContentNode(selection)
        .filter((input) => input.content.trim())
        .sort(() => Math.random() - 0.5),
      goalOrInstruction: defaultContext, // TODO wireup with UI input
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
  goalOrInstruction: string | undefined;
  onStringify: (item: T) => string;
  abortSignal?: AbortSignal;
  onFinding?: (finding: SyntheticFinding<T>) => any;
}

export async function synthesizeStream<T>({
  openai,
  items,
  goalOrInstruction,
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
Synthesize findings from evidence items based on user's goal or instruction.
Each finding should represent single cohesive concept emerged from multiple evidence items.
Support each finding with *2 or more* evidence items id numbers

Respond in JSON format like this:
"""
{
  "findings": [
    {
      "name": "<name of the finding>",
      "description": "<one sentence description of this finding>",
      "evidence": [<id number>, <id number>, ...]
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
${goalOrInstruction?.trim().length ? goalOrInstruction : defaultContext}

Evidence items:
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
  const findings: SyntheticFinding<T>[] = [];

  parser.onValue = (v) => {
    const finding = parseFinding<T>(v?.value);
    if (finding) {
      const items = finding.evidence.map((id) => {
        usedIds.add(id);
        return originalItems.find((item) => item.id === id)!.data;
      });

      const mappedFinding = { name: finding.name, description: finding.description, items };
      findings.push(mappedFinding);
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

      findings.push(unusedFinding);
      onFinding?.(unusedFinding);
    }

    parsingTask.resolve(findings);
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

interface ParsedFinding<T> {
  name: string;
  description: string;
  evidence: number[];
}
function parseFinding<T>(value?: any): ParsedFinding<T> | null {
  if (
    Object.getOwnPropertyNames(value as {})
      .sort()
      .join(",") === "description,evidence,name"
  ) {
    if (typeof value.name !== "string") throw new Error("Expected name string in finding");
    if (typeof value.description !== "string") throw new Error("Expected description string in finding");
    if (!Array.isArray(value.evidence)) throw new Error("Expected evidence array in finding");
    if (!value.evidence.every((id: any) => typeof id === "number")) throw new Error("Expected number in evidence array");

    return {
      name: value.name as string,
      description: value.description as string,
      evidence: value.evidence as number[],
    };
  } else {
    return null;
  }
}
