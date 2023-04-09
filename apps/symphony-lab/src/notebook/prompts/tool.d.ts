export type SearchProvider =
  | "web" // web search
  | "arxiv" // paper search for applied science
  | "wikipedia" // factual search
  | "ux_db"; // ux research repo

/**
 * Workflow is a sequence of steps that create and transform a list of items
 * @example
 * // Search the web for AD-free Gitf ideas
 * Workflow.fromSearch("web", "2023 Gift Ideas", 10).filter("Remove article that contains ADs")
 * // Categorize highly cited papers related to "Nuclear fusion"
 * Workflow.fromSearch("arxiv", "Nuclear fusion", 25).filter("Citation > 30").map("Add a categorize label that is one of ['lit review', 'primary research', 'other']")
 */
export interface Workflow {
  /**
   * Create a list from a SearchProvider
   */
  static fromSearch(provider: SearchProvider, query: string, limit: number): Workflow;

  /**
   * Transform each Item in the List
   * @param howToMap is a description on how each item should be transformed
   */
  map(howToMap: string): Workflow;

  /**
   * @param howToFilter is a description on how each item should be kept or thrown away
   */
  filter(howToFilter: string): Workflow;

  /**
   * @param howToReduce is a description on how update an accumuated result from each item
   */
  reduce(howToReduce: string): Workflow;

  /**
   * @param howToSort is a description on how what facet to focus on and what order (ascending, descending) to sort into
   */
  sort(howToSort: string): Workflow;
}
