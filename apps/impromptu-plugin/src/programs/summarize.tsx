import { getCompletion } from "../openai/completion";
import { responseToArray } from "../openai/format";
import { stickyColors } from "../utils/colors";
import { createOrUseSourceNodes, createTargetNodes, moveStickiesToSection, setFillColor } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType, getInnerStickies } from "../utils/query";
import { combineWhitespace, shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class SummarizeProgram implements Program {
  public name = "summarize";

  public getSummary(node: FrameNode) {
    return `Summarize: reduce to ${getFieldByLabel("Max item count", node)!.value.characters} items.`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>Summarize</FormTitle>
        <Description>Reduce a full list of stickies to a more concise list of stickies.</Description>
        <TextField label="Max item count" value="5" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Summarize", node)!.locked = true;
    getFieldByLabel("Max item count", node)!.label.locked = true;

    const sources = createOrUseSourceNodes(["Full list"], context.selectedOutputNodes);
    const targets = createTargetNodes(["Summarized list"]);

    return {
      programNode: node,
      sourceNodes: sources,
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const maxItemCount = parseInt(getFieldByLabel("Max item count", node)!.value.characters);

    const inputStickies = getInnerStickies(context.sourceNodes);
    if (!inputStickies.length) return;

    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetNode) return;

    const getInitSummary = async () => {
      // initially, use superficial titles
      const allTitles = inputStickies
        .map(
          (sticky) =>
            `- ${shortenToWordCount(2000 / inputStickies.length, `${combineWhitespace(sticky.text.characters)} ${sticky.getPluginData("shortContext")}`)}`
        )
        .join("\n");
      const safeTitles = shortenToWordCount(2000, allTitles);
      const initPrompt = `
Summarize the full list into a concise list with up to ${maxItemCount} items, 10 words per item.

Full list (bullet list): 
${safeTitles}

Concise list (bullet list, up to ${maxItemCount} items):
- `;

      return responseToArray(
        (
          await getCompletion(context.completion, initPrompt, {
            max_tokens: Math.max(500, Math.min(maxItemCount * 50, 200)),
          })
        ).choices[0].text
      );
    };

    const summarizedItems = await getInitSummary();

    if (context.isChanged() || context.isAborted()) return;

    const newStickies = summarizedItems.map((item) => {
      const sticky = figma.createSticky();
      setFillColor(stickyColors.Yellow, sticky);
      sticky.text.characters = item;
      return sticky;
    });

    moveStickiesToSection(newStickies, targetNode);
  }
}
