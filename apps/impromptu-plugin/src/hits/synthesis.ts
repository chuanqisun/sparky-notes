import { getCompletion } from "../openai/completion";
import { findMatchedProgram, Program, PROGRAME_NAME_KEY, ReflectionContext } from "../programs/program";
import { getSourceGraph } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToHaveWidgetDataKey } from "../utils/query";
import { getPrimaryDataNode } from "../utils/selection";
import { combineWhitespace, shortenToWordCount } from "../utils/text";

export interface Synthesis {
  title: string;
  introduction: string;
  methodology: string;
}

export async function getSynthesis(context: ReflectionContext, programs: Program[], dataNodeId: string): Promise<Synthesis | null> {
  const matchProgram = findMatchedProgram.bind(null, programs);
  const { completion } = context;

  replaceNotification("Generating methodology...");
  const dataNode = figma.getNodeById(dataNodeId);
  if (!dataNode) {
    replaceNotification("Section node does not exist.", { error: true });
    return null;
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
        if (!program) return null;
        return program.getMethodology(context, programNode);
      })
    )
  ).filter(Boolean) as string[];

  if (methodologyList.length) {
    const methodologyPrompt = `
A research report is generated using the following steps. Each step is performed by a human assisted by a human-in-the-loop research tool called Impromptu. Summarize the entire process into a "Methodology" section.

Steps:
${methodologyList.map((step, index) => `${index + 1}. ${step}`).join("\n")};

Methodology: `.trimStart();
    const methodologyCompletion = await getCompletion(completion, methodologyPrompt, { max_tokens: 300 });
    methodology = methodologyCompletion.choices[0].text.trim();
  }

  replaceNotification("Generating title and introduction...");
  const primaryDataNode = getPrimaryDataNode(dataNode as SectionNode);

  const bodyText = `
    ${primaryDataNode?.orderedStickies
      .map((sticky) => {
        switch (sticky.color) {
          case "Green":
            const title = `# ${sticky.text}`;
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

  const synthesisPrompt = `
Based on information from the following Report body, use the following format to write a very short title and an introduction paragraph.

Format """
Title: <The very short title of the report>
Introduction: <The introduction paragraph of the report>
"""

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
}
"""

Begin!
Title: `;

  const synthesis = (await getCompletion(completion, synthesisPrompt, { max_tokens: 300 })).choices[0].text;
  const lines = synthesis.split("\n");
  const introLineIndex = lines.findIndex((line) => line.toLocaleLowerCase().startsWith("introduction:"));
  const title = combineWhitespace(lines.slice(0, introLineIndex).join("\n").trim());
  const introduction = lines
    .slice(introLineIndex)
    .join("\n")
    .replace(/^introduction\:/i, "")
    .trim();

  const synthesisResult = { title, introduction, methodology };
  return synthesisResult;
}
