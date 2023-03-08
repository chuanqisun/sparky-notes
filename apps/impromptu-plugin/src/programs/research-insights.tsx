import { EntityName, EntityType } from "../hits/entity";
import { getInsightQuery } from "../hits/search";
import { moveStickiesToSection, resizeToHugContent } from "../utils/edit";
import { FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType } from "../utils/query";
import { Program, ProgramContext } from "./program";

const { AutoLayout } = figma.widget;

export class ResearchInsightsProgram implements Program {
  public name = "research-insights";

  public getSummary(node: FrameNode) {
    const input = getFieldByLabel("Query", node)!;
    return ` Find UX Insights: "${input.value.characters}"`;
  }

  public async create() {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Research Insights</FormTitle>
        <TextField label="Query" value="Azure Portal accessibility" />
        <TextField label="Limit" value="50" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Research Insights", node)!.locked = true;
    getFieldByLabel("Query", node)!.label.locked = true;

    const target1 = figma.createSection();
    target1.name = "Insights";

    return {
      programNode: node,
      sourceNodes: [],
      targetNodes: [target1],
    };
  }

  public async onEdit(node: FrameNode) {
    this.abortCurrentSearch = true;
  }

  private abortCurrentSearch = false;

  public async run(context: ProgramContext, node: FrameNode) {
    const targetNode = getNextNodes(node).filter(filterToType<SectionNode>("SECTION"))[0];
    if (!targetNode) return;

    const query = getFieldByLabel("Query", node)!.value.characters.trim();
    const limit = parseInt(getFieldByLabel("Limit", node)!.value.characters.trim());

    let currentSkip = 0;
    let resultCount = 0;
    const pageSize = 5;
    let hasMore = true;
    this.abortCurrentSearch = false;

    const dummyStikcy = figma.createSticky();
    await figma.loadFontAsync(dummyStikcy.text.fontName as FontName);
    dummyStikcy.remove();

    targetNode.children.forEach((child) => child.remove());
    resizeToHugContent(targetNode);

    while (hasMore && resultCount < limit && !context.isAborted() && !this.abortCurrentSearch) {
      const searchSummary = await context.hitsSearch(getInsightQuery({ query, top: pageSize, skip: currentSkip, count: currentSkip === 0 }));
      hasMore = searchSummary.totalCount > currentSkip + pageSize;

      const stickies = await Promise.all(
        searchSummary.results.flatMap((item) =>
          item.document.children
            .filter((child) => child.entityType === EntityType.Insight)
            .filter((child) => child.title)
            .map(async (child) => {
              const sticky = figma.createSticky();
              sticky.text.characters = child.title!;
              sticky.text.hyperlink = {
                type: "URL",
                value: `https://hits.microsoft.com/${EntityName[child.entityType]}/${child.id}`,
              };
              return sticky;
            })
        )
      );

      resultCount += stickies.length;
      moveStickiesToSection(stickies, targetNode);
    }
  }
}
