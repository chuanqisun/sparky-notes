import { ChatMessage } from "../openai/chat";
import { Program, PROGRAME_NAME_KEY, ReflectionContext } from "../programs/program";
import { getSourceGraph } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToHaveWidgetDataKey } from "../utils/query";
import { getPrimaryDataNode } from "../utils/selection";
import { combineWhitespace, shortenToWordCount } from "../utils/text";

export interface Synthesis {
  title: string;
  introduction: string;
  methodology: string;
  insightTitleMap: Record<string, string>;
  error?: string;
}

export async function getSynthesis(context: ReflectionContext, matchProgram: (baseNode: BaseNode) => Program | null, dataNodeId: string): Promise<Synthesis> {
  replaceNotification("Generating methodology...");
  const { completion } = context;

  const dataNode = figma.getNodeById(dataNodeId);
  if (!dataNode) {
    throw new Error("Section node does not exist.");
  }

  const sourceGraph = getSourceGraph([dataNode as SectionNode]);
  const programNodes = (sourceGraph.nodeIds.map((id) => figma.getNodeById(id)).filter(Boolean) as SceneNode[]).filter(
    filterToHaveWidgetDataKey<FrameNode>(PROGRAME_NAME_KEY)
  );

  let methodology = "";
  const methodologyList = (
    await Promise.all(
      programNodes.map((programNode) => {
        const program = matchProgram(programNode);
        if (!program) throw new Error(`Invalid program node id "${programNode.id}"`);
        return program.getMethodology(context, programNode);
      })
    )
  ).filter(Boolean) as string[];

  if (methodologyList.length) {
    const methodologyMessages: ChatMessage[] = [
      {
        role: "system",
        content: `
You are a research assistant. The user describes the steps in a reseach process. Each step was performed by a human assisted by a human-in-the-loop AI reasoning tool called Impromptu.
You must summarize the entire research process into a methodology paragraph. Be very accurate and objective. Write in past tense. Respond with a single paragraph.
`.trim(),
      },
      {
        role: "user",
        content: `
Steps:
${methodologyList.map((step, index) => `${index + 1}. ${step}`).join("\n")}
        `.trim(),
      },
    ];

    methodology = (await context.chat(methodologyMessages, { max_tokens: 300, temperature: 0.2 })).choices[0].message?.content ?? "";
  }

  const primaryDataNode = getPrimaryDataNode(dataNode as SectionNode);

  const insightMap = new Map<string, string>();
  const higherOrderStickies = primaryDataNode?.orderedStickies.filter((sticky) => sticky.color === "Green" && sticky.childText?.trim()) ?? [];

  for (const sticky of higherOrderStickies) {
    replaceNotification(`Synthesizing insight: "${sticky.text.trim()}"...`);
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `
You are a research assistant with extraordinary communication skills.
The user will provide the title and body of claim. You will summarize it into a one-sentence claim in news headline style. Make sure it is insightful.
Respond with a single sentence.
      `.trim(),
      },
      {
        role: "user",
        content: `
Title: ${sticky.text.trim()}
Body: ${combineWhitespace(sticky.childText!.trim())}
      `.trim(),
      },
    ];

    try {
      const claim = (await context.chat(messages, { max_tokens: 300 })).choices[0].message?.content ?? "Untitled";
      insightMap.set(sticky.id, claim);
    } catch (e) {
      // ignore non-fatal errors
    }
  }

  const bodyText = `
    ${primaryDataNode?.orderedStickies
      .map((sticky) => {
        switch (sticky.color) {
          case "Green":
            const title = `# ${insightMap.get(sticky.id) ?? sticky.text}`;
            const context = sticky.childText;
            return `${title}${context ? `\n\n${context}` : ""}`;
          case "Yellow":
            return sticky.url ? `- **Insight** ${sticky.text}` : `- **Insight** ${sticky.text}`;
          case "LightGray":
            return `${sticky.text}`;
          default:
            return "";
        }
      })
      .join("\n\n")}`.trim();

  const titleMessages: ChatMessage[] = [
    {
      role: "system",
      content: `
Write a short title for the following report. Respond with just the title
    `.trim(),
    },
    {
      role: "user",
      content: `
${`${shortenToWordCount(2000, bodyText)}
${
  methodology
    ? `

# Methodology

${methodology}
`
    : ""
}`.trim()}`.trim(),
    },
  ];

  replaceNotification("Generating title...");
  const title = (await context.chat(titleMessages, { max_tokens: 100 })).choices[0].message.content?.trim() ?? "";

  const introMessages: ChatMessage[] = [
    {
      role: "system",
      content: `
Write an introduction paragraph for the following Report title and body. Make it interesting and engaging. Respond with just the introudction paragraph.
      `.trim(),
    },
    {
      role: "user",
      content: `
${`${shortenToWordCount(1700, bodyText)}
${
  methodology
    ? `

# Methodology

${methodology}
`
    : ""
}`.trim()}
      `.trim(),
    },
  ];

  replaceNotification("Generating introduction...");
  const introduction = (await context.chat(introMessages, { max_tokens: 300 })).choices[0].message.content?.trim() ?? "";

  const synthesisResult = { title, introduction, methodology, insightTitleMap: Object.fromEntries(insightMap) };
  return synthesisResult;
}
