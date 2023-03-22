import { stickyColors } from "../utils/colors";
import { createTargetNodes, moveStickiesToSection, setFillColor } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType } from "../utils/query";
import { shortenToWordCount } from "../utils/text";
import { CreationContext, Program, ProgramContext } from "./program";

const { AutoLayout } = figma.widget;

export class ArxivSearchProgram implements Program {
  public name = "arxiv-search";

  public getSummary(node: FrameNode) {
    const input = getFieldByLabel("Query", node)!;
    return `arXiv search: "${input.value.characters}"`;
  }

  public async create(context: CreationContext) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={400}>
        <FormTitle>arXiv search</FormTitle>
        <Description>Find acamedic papers from arXiv.org</Description>
        <TextField label="Query" value="Nuclear fusion" />
        <TextField label="Limit" value="10" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("arXiv search", node)!.locked = true;
    getFieldByLabel("Query", node)!.label.locked = true;
    const targets = createTargetNodes(["Search results"]);

    return {
      programNode: node,
      sourceNodes: [],
      targetNodes: targets,
    };
  }

  public async run(context: ProgramContext, node: FrameNode) {
    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetNode) return;

    const query = getFieldByLabel("Query", node)!.value.characters.trim();
    const limit = parseInt(getFieldByLabel("Limit", node)!.value.characters.trim());

    const normalizedQuery = query
      .replace(/"|'/g, "")
      .split(" ")
      .filter(Boolean)
      .map((word) => `all:${word}`)
      .join("+OR+");
    const { entries: items } = await context.arxivSearch({ q: normalizedQuery, limit });
    if (context.isChanged() || context.isAborted()) return;
    console.log(`[arxiv] ${items.length} urls found`);

    let resultCount = 0;

    for (const item of items) {
      const sticky = figma.createSticky();
      setFillColor(stickyColors.Yellow, sticky);
      sticky.text.characters = `${item.title}\n\n${shortenToWordCount(50, item.summary)}`;
      sticky.text.hyperlink = {
        type: "URL",
        value: item.url,
      };
      sticky.setPluginData("shortContext", item.summary);

      resultCount++;
      moveStickiesToSection([sticky], targetNode);

      if (resultCount === limit) return;
    }
  }
}
