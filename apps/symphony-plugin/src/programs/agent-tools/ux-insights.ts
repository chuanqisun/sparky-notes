import { EntityType } from "../../hits/entity";
import { getClaimQuery } from "../../hits/search";
import { shortenToWordCount } from "../../utils/text";
import { BaseTool, ToolRunInput, ToolRunOutput } from "./base-tool";

export class UxInsightTool extends BaseTool {
  name = "UX Insights";
  description = "Search usability issues and solultions for any Microsoft product. Give this tool only keywords";

  async run(input: ToolRunInput): Promise<ToolRunOutput> {
    const query = input.actionInput.replace("Action Input:", "").trim();
    const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
    try {
      const searchSummary = await input.programContext.hitsSearch(getClaimQuery({ query: normalizedQuery, top: 3 }));
      if (!searchSummary.results.length) {
        return { observation: "No results found." };
      }

      const observation =
        searchSummary.results
          .flatMap((result, reportIndex) =>
            result.document.children
              .slice(0, 5)
              .filter((child) => child.title?.trim())
              .filter((child) => [EntityType.Insight, EntityType.Recommendation].includes(child.entityType))
              .map((child, claimIndex) => `${reportIndex + 1}.${claimIndex + 1} ${shortenToWordCount(50, child.title!)}`)
          )
          .join(" ") + "...";
      return { observation };
    } catch (e) {
      return { observation: "No results found." };
    }
  }
}
