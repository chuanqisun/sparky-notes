import { getLongContext, getShortContext } from "../hits/additional-context";
import { EntityName, EntityType } from "../hits/entity";
import { removeHighlightHtml } from "../hits/highlight";
import { getRecommendationQuery } from "../hits/search";
import { moveStickiesToSection, resizeToHugContent } from "../utils/edit";
import { Description, FormTitle, getFieldByLabel, getTextByContent, TextField } from "../utils/form";
import { getNextNodes } from "../utils/graph";
import { filterToType } from "../utils/query";
import { Program, ProgramContext } from "./program";

const { AutoLayout } = figma.widget;

export class ResearchRecommendationsProgram implements Program {
  public name = "research-recommendations";

  public getSummary(node: FrameNode) {
    const input = getFieldByLabel("Query", node)!;
    return ` Find UX Insights: "${input.value.characters}"`;
  }

  public async create() {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
        <FormTitle>Research Recommendations</FormTitle>
        <Description>Recommendations from HITS.microsoft.com</Description>
        <TextField label="Query" value="Xbox Cloud Gaming" />
        <TextField label="Limit" value="10" />
      </AutoLayout>
    )) as FrameNode;

    getTextByContent("Research Recommendations", node)!.locked = true;
    getFieldByLabel("Query", node)!.label.locked = true;

    const target1 = figma.createSection();
    target1.name = "Recommendations";

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
      const searchSummary = await context.hitsSearch(getRecommendationQuery({ query, top: pageSize, skip: currentSkip, count: currentSkip === 0 }));
      hasMore = searchSummary.totalCount > currentSkip + pageSize;

      for (const report of searchSummary.results) {
        const children = report.document.children.filter((child) => child.title).filter((child) => child.entityType === EntityType.Insight);
        const highlights = [...(report.highlights!["children/Title"] ?? []), ...(report.highlights!["children/Contents"] ?? [])].map(removeHighlightHtml);

        for (let highlight of highlights) {
          const titleMatchedChild = children.find((child) => child.title?.toLocaleLowerCase().includes(highlight.toLocaleLowerCase()));
          const contentsMatchedChild = children.find((child) => child.contents?.toLocaleLowerCase().includes(highlight.toLocaleLowerCase()));
          const anyMatchedChild = titleMatchedChild ?? contentsMatchedChild;

          if (anyMatchedChild) {
            const sticky = figma.createSticky();
            sticky.text.characters = titleMatchedChild ? highlight : contentsMatchedChild!.title!;
            sticky.text.hyperlink = {
              type: "URL",
              value: `https://hits.microsoft.com/${EntityName[anyMatchedChild.entityType]}/${anyMatchedChild.id}`,
            };

            const longContext = getLongContext(report, anyMatchedChild);
            sticky.setPluginData("longContext", longContext);
            sticky.setPluginData("shortContext", getShortContext(report, anyMatchedChild));

            resultCount++;
            moveStickiesToSection([sticky], targetNode);
          }

          if (resultCount >= limit) return;
        }
      }
    }
  }
}
