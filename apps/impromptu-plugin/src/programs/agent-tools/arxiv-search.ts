import { shortenToWordCount } from "../../utils/text";
import { BaseTool, ToolRunInput, ToolRunOutput } from "./base-tool";

export class ArxivSearchTool extends BaseTool {
  name = "arXiv Search";
  description = "Search academic papers. Give this tool only keywords";

  async run(input: ToolRunInput): Promise<ToolRunOutput> {
    try {
      const query = input.actionInput.replace("Action Input:", "").trim();
      const normalizedQuery = query
        .replace(/"|'/g, "")
        .split(" ")
        .filter(Boolean)
        .map((word) => `all:${word}`)
        .join("+OR+");
      const searchResults = await input.programContext.arxivSearch({ q: normalizedQuery, limit: 3 });
      const observation = searchResults.entries
        .map((entry, index) => `Result ${index + 1}: ${entry.title} ${shortenToWordCount(50, entry.summary)}...`)
        .join(" ");
      return { observation };
    } catch (e) {
      return { observation: "No results found." };
    }
  }
}
