export interface Step {
  name: string; // Summarize Task description into short name
  analysis: string; // Describe what goal of the task, the expected outcome
  idealTool: string; // The ideal tool regardless of what is available for the step
  chosenTool: null | keyof Tools; // Null means no tool matches the step
  toolInput: Record<string, any>; // matches the input object
}

export interface Tools {
  // Get a list of pages from one of the following providers:
  // google: general search. The results cannot be trusted
  // wikipedia: good for factual information
  // arxiv: applied research papers
  // ux_db: UX research reports on Microsoft products
  search(input: { provider: "google" | "wikipedia" | "arxiv" | "ux_db"; query: string; limit: number });

  // Use a predicate to filter the list from the previous step
  // Predict is a Yes/No question to test each item.
  // Items with Yes will be kept
  filter_in(input: { predicate: string });

  // Items with Yes will be removed
  filter_out(input: { predicate: string });

  // Categorize information into provided number of groups. Labels will be derived from the result
  categorize_unsupervised(input: { categoryCount: number });

  // Categorize information into predefined groups
  categorize_supervised(input: { labels: string[] });

  // Extract information from each item, based on what to focus on
  extract(input: { focus: string });

  // Add a new property with the provided purpose to each item
  extend(input: { property: string; purpose: string });

  sort(input: { facet: string; order: "asc" | "desc" });
}
