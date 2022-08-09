export const SEARCH_QUERY = `query Search($args: SearchArgs!) {
  search(args: $args) {
    organicResults {
      id
      title
    }
  }
}`;
