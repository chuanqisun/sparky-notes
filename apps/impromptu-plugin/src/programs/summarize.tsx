import { getCompletion } from "../openai/completion";
import { arrayToBulletList, responseToArray, responseToBulletList } from "../openai/format";
import { moveStickiesToSection, resizeToHugContent } from "../utils/edit";
import { ensureStickyFont } from "../utils/font";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { replaceNotification } from "../utils/notify";
import { filterToType, getInnerStickies } from "../utils/query";
import { shortenToWordCount } from "../utils/text";
import { Program, ProgramContext } from "./program";

const { Text, AutoLayout, Input } = figma.widget;

export class SummarizeProgram implements Program {
  public name = "summarize";

  public getSummary(node: FrameNode) {
    return `Summarize: reduce to ${getFieldByLabel("Max item count", node)!.value.characters} items.`;
  }

  public async create() {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Summarize</FormTitle>
        <Description>Reduce a full list of stickies to a more concise list of stickies.</Description>
        <TextField label="Max item count" value="5" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Summarize", node)!.locked = true;
    getFieldByLabel("Max item count", node)!.label.locked = true;

    const source1 = figma.createSection();
    source1.name = "Full list";

    const target1 = figma.createSection();
    target1.name = "Summarized list";

    return {
      programNode: node,
      sourceNodes: [source1],
      targetNodes: [target1],
    };
  }

  private abortCurrentRun = false;

  public async onEdit(node: FrameNode) {
    this.abortCurrentRun = true;
  }

  public async run(context: ProgramContext, node: FrameNode) {
    this.abortCurrentRun = false;
    const maxItemCount = parseInt(getFieldByLabel("Max item count", node)!.value.characters);

    const inputStickies = getInnerStickies(context.sourceNodes);
    if (!inputStickies.length) return;

    await ensureStickyFont();

    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    targetNode.children.forEach((child) => child.remove());

    const getInitSummary = async () => {
      // initially, use superficial titles
      const allTitles = inputStickies.map((sticky) => `- ${sticky.text.characters}`).join("\n");
      const safeTitles = shortenToWordCount(2000, allTitles);
      const initPrompt = `
Summarize the full list into a concise list with up to ${maxItemCount} items, 10 words per item.

Full list (bullet list): 
${safeTitles}

Concise list (bullet list, up to ${maxItemCount} items):
- `;

      return responseToBulletList(
        (
          await getCompletion(context.completion, initPrompt, {
            max_tokens: Math.max(500, Math.min(maxItemCount * 50, 200)),
          })
        ).choices[0].text
      );
    };

    let rollingSummary = await getInitSummary();

    if (this.abortCurrentRun || context.isAborted()) return;

    for (let inputSticky of inputStickies) {
      replaceNotification(`Summarize: incorporating "${inputSticky.text.characters}"`);

      const optionalContext = inputSticky.getPluginDataKeys().includes("shortContext") ? inputSticky.getPluginData("shortContext") : "";

      const prompt = `
Summary (bullet list):
${rollingSummary}

New information:
${inputSticky.text.characters} ${optionalContext}

Use the new information to adjust the summary. Update only if the new information is significantly different from the summary so far.

Updated summary (bullet list, up to ${maxItemCount} items, 10 words per item):
- `;

      const rollingSummaryItems = responseToArray(
        (
          await getCompletion(context.completion, prompt, {
            max_tokens: Math.max(500, Math.min(maxItemCount * 50, 200)),
          })
        ).choices[0].text
      );

      if (this.abortCurrentRun || context.isAborted()) return;

      if (!rollingSummaryItems.length) continue;

      rollingSummary = arrayToBulletList(rollingSummaryItems);

      const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
      targetNode.children.forEach((child) => child.remove()); // todo recycle nodes

      const newStickies = rollingSummaryItems.map((item) => {
        const sticky = figma.createSticky();
        sticky.text.characters = item;
        return sticky;
      });

      moveStickiesToSection(newStickies, targetNode);
      const inputContainer = inputSticky.parent;
      inputSticky.remove();
      resizeToHugContent(inputContainer as any);
    }
  }
}
