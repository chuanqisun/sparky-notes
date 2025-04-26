import { JSONParser } from "@streamparser/json";
import OpenAI from "openai";
import type { ResponseInputImage } from "openai/resources/responses/responses.mjs";
import { last, mergeScan, Subject, tap } from "rxjs";
import { ensureApiKey, getApiKey } from "./api-key";
import { contentNodesToIdContentNode, getItemText } from "./object-tree";
import { proxyToFigma } from "./proxy";
import { selection$ } from "./selection";
import { createTask } from "./task";
import { ensureTokenLimit } from "./tokenizer";

export async function runGenerate() {
  const apiKey = ensureApiKey(getApiKey());
  const selection = selection$.value;
  const thingsToGenerateInput = document.querySelector<HTMLTextAreaElement>(`[name="generate-instruction"]`);
  const thingsToGenerate = [thingsToGenerateInput?.value, thingsToGenerateInput?.placeholder].filter(Boolean).at(0);
  if (!thingsToGenerate) {
    proxyToFigma.notify({ showNotification: { message: "Generation is missing objective", config: { error: true } } });
    throw new Error("Generation is missing objective");
  }

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey,
  });

  const { handle, abortController } = createTask();
  let progress = 0;
  proxyToFigma.notify({ showNotification: { message: `Generating...`, config: { timeout: Infinity }, cancelButton: { handle } } });

  const createdSections: { id: string; name: string }[] = [];

  const $render = new Subject<GeneratedItem>();
  $render
    .pipe(
      mergeScan(
        async (_prev, finding) => {
          const sectionName = thingsToGenerate;
          let existingSection = createdSections.find((section) => section.name === sectionName)?.id;
          if (!existingSection) {
            const { mutationResponse } = await proxyToFigma.request({
              mutationRequest: {
                position: createdSections.length ? { relativeToNodes: { ids: [createdSections.at(-1)!.id] } } : { viewportCenter: {} },
                createSections: [{ name: sectionName }],
              },
            });

            const sectionId = mutationResponse?.createdSections[0];
            if (!sectionId) throw new Error("Failed to create section");
            createdSections.push({ id: sectionId, name: sectionName });
            existingSection = sectionId;
          }

          // Always create new sticky for each generated item
          await proxyToFigma.request({
            mutationRequest: {
              updateSections: [
                {
                  id: existingSection,
                  createNodes: [finding.text],
                  flowDirection: "vertical",
                },
              ],
            },
          });

          proxyToFigma.notify({
            showNotification: { message: `Generating... ${++progress} items`, config: { timeout: Infinity }, cancelButton: { handle } },
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
            message: `✅ Generating... done. ${progress} items`,
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
    await generateStream({
      openai,
      thingsToGenerate,
      sourceItems: items.length ? items.map(getItemText) : undefined,
      attachments: items.flatMap((item) => item.attachments ?? []),
      abortSignal: abortController.signal,
      onItem: (finding) => $render.next(finding),
    });
  } finally {
    $render.complete();
  }

  return;
}

export interface GeneratedItem {
  text: string;
}

export interface GenerateStreamOptions {
  openai: OpenAI;
  thingsToGenerate: string;
  sourceItems?: string[];
  attachments?: {
    mimeType: string;
    dataUrl: string;
  }[];
  abortSignal?: AbortSignal;
  onItem?: (item: GeneratedItem) => any;
}

export async function generateStream({
  openai,
  thingsToGenerate,
  sourceItems,
  attachments,
  abortSignal,
  onItem,
}: GenerateStreamOptions): Promise<GeneratedItem[]> {
  let itemsYaml = "";
  if (sourceItems && sourceItems.length) {
    itemsYaml = sourceItems
      .map((item, idx) =>
        `
[id: ${idx + 1}]
${item}`.trim()
      )
      .join("\n\n");
  }

  const safeCount = ensureTokenLimit(10_000, itemsYaml);
  console.log({ safeCount });

  // Compose prompt
  let systemPrompt = "";
  let userPrompt: any = undefined;
  systemPrompt = `
Generate ${thingsToGenerate} based on user's goal or instruction
Respond in JSON format of this type

type Response = {
  results: string[]; // generated items
}
    `.trim();
  userPrompt = [
    {
      type: "input_text",
      text: `
${itemsYaml ? `Generate ${thingsToGenerate} based on the following objects:` : `Generate ${thingsToGenerate}`}
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
  ];

  const result = await openai.responses.create(
    {
      stream: true,
      model: "gpt-4.1",
      text: { format: { type: "json_object" } },
      temperature: 0.2,
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    },
    {
      signal: abortSignal,
    }
  );

  const parser = new JSONParser();
  const parsingTask = Promise.withResolvers<GeneratedItem[]>();
  const generatedItems: GeneratedItem[] = [];

  parser.onValue = (v) => {
    const parsed = parseGenerated(v?.value);
    if (!parsed) return;
    onItem?.({ text: parsed.content });
  };

  parser.onEnd = () => {
    parsingTask.resolve(generatedItems);
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

interface ParsedGenerated {
  content: string;
}
function parseGenerated(value?: any): ParsedGenerated | null {
  if (typeof value === "string") {
    return {
      content: value,
    };
  } else {
    return null;
  }
}
