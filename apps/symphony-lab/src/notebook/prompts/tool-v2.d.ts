export interface Step {
  name: string; // Summarize Task description into short name
  analysis: string; // Describe what goal of the task, the expected outcome
  idealTool: string; // The ideal tool regardless of what is available for the step
  chosenTool: null | string; // Null means no tool matches the step. the string must be a key of Tools
  toolInput: Record<string, any>; // matches the input object
  description: string; // Precisely state the chosen tool and input in natural language
}

export interface Tools {
  // Get a list of pages from one of the following providers:
  // google: general search. The results cannot be trusted
  // wikipedia: good for factual information
  // arxiv: applied research papers
  // hits: UX research reports on Microsoft products
  search(input: { provider: "google" | "wikipedia" | "arxiv" | "hits"; query: string; limit: number; skip: number });

  // Use a predicate to filter the list from the previous step
  // Predicate describes what items to keep
  // Items with Yes will be kept
  keep_by_filter(input: { predicate: string });

  // Use a predicate to filter the list from the previous step
  // Predicate describes what items to remove
  // Items with Yes will be removed
  remove_by_filter(input: { predicate: string });

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
