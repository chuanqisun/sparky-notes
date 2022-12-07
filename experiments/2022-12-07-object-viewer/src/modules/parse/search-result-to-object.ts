import { SearchResultItem } from "../hits/search-api";

export function searchOutputToObject(searchResult: SearchResultItem) {
  const document = searchResult.document;

  return {
    id: document.id,
    title: document.title ?? "",
    body: normalizeSpace(document.contents ?? ""),
    children: searchResult.document.children.map((child) => ({ id: child.id, title: child.title ?? "", body: normalizeSpace(child.contents ?? "") })),
  };
}

const normalizeSpace = (input: string) => input?.trim().replace(/\s+/g, " ");
