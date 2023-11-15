import { BaseTool, ToolRunInput, ToolRunOutput } from "./base-tool";

export class WebSearchTool extends BaseTool {
  name = "Web Search";
  description = "Search the internet for general ideas";

  async run(input: ToolRunInput): Promise<ToolRunOutput> {
    try {
      const query = input.actionInput.replace("Action Input:", "").trim();
      const normalizedQuery = query.startsWith(`"`) && query.endsWith(`"`) ? query.slice(1, -1) : query;
      const searchResults = await input.programContext.webSearch({ q: normalizedQuery });
      const observation = searchResults.pages
        .slice(0, 4)
        .map((page, index) => `Result ${index + 1}: ${page.title} ${page.snippet}`)
        .join(" ");
      return { observation };
    } catch (e) {
      return { observation: "No results found." };
    }
  }
}
