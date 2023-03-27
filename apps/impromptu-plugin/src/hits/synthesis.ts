import { getCompletion } from "../openai/completion";
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
    const methodologyPrompt = `
A research report is generated using the following steps. Each step is performed by a human assisted by a human-in-the-loop AI reasoning environment called Impromptu. Summarize the entire process into a "Methodology" paragraph.

Steps:
${methodologyList.map((step, index) => `${index + 1}. ${step}`).join("\n")}

Methodology paragraph: `.trimStart();
    const methodologyCompletion = await getCompletion(completion, methodologyPrompt, { max_tokens: 300 });
    methodology = methodologyCompletion.choices[0].text.trim();
  }

  const primaryDataNode = getPrimaryDataNode(dataNode as SectionNode);

  const insightMap = new Map<string, string>();
  const higherOrderStickies = primaryDataNode?.orderedStickies.filter((sticky) => sticky.color === "Green" && sticky.childText?.trim()) ?? [];

  for (const sticky of higherOrderStickies) {
    replaceNotification(`Synthesizing insight: "${sticky.text.trim()}"...`);
    const prompt = `
Summarize the following title and body into a short one-sentence claim that sounds insightful.
Title: ${sticky.text.trim()}
Body: ${combineWhitespace(sticky.childText!.trim())}
One sentence claim: `.trimStart();

    try {
      const claim = await getCompletion(completion, prompt, { max_tokens: 300 }).then((res) => res.choices[0].text.trim());
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

  const titlePrompt = `
Write a short title for the following Report.

Report """
${`${shortenToWordCount(1700, bodyText)}
${
  methodology
    ? `

# Methodology

${methodology}
`
    : ""
}`.trim()}
"""

Title: `;

  replaceNotification("Generating title...");
  const title = (await getCompletion(completion, titlePrompt, { max_tokens: 100 })).choices[0].text.trim();

  const introPrompt = `
Based on information from the following Report title and body, write an introduction paragraph.

Report title: ${title}

Report body """
${`${shortenToWordCount(1700, bodyText)}
${
  methodology
    ? `

# Methodology

${methodology}
`
    : ""
}`.trim()}
"""

Introduction paragraph: `;

  replaceNotification("Generating introduction...");
  const introduction = (await getCompletion(completion, introPrompt, { max_tokens: 300 })).choices[0].text.trim();

  const synthesisResult = { title, introduction, methodology, insightTitleMap: Object.fromEntries(insightMap) };
  return synthesisResult;
}
