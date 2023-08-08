import { getUniqueFilter } from "../../utils/get-unique-filter";
import { EntityType } from "../hits/entity";
import { getHighlightHtml, getHighlightWords } from "../hits/highlight";
import type { SearchResultDocument, SearchResultItem, SearchResultOutline, SearchResultOutlineChild } from "../hits/hits";

export interface HitsDisplayNode {
  children: HitsDisplayChildNode[];
  entityType: number;
  id: string;
  idHtml: string;
  title: string;
  researchers: {
    id: number;
    displayName: string;
  }[];
  titleHtml: string;
  researchersHtml: string;
  updatedOn: Date;
  showAllChildren?: boolean;
}
export interface HitsDisplayChildNode {
  entityType: number;
  hasHighlight: boolean;
  id: string;
  idHtml: string;
  isNative: boolean;
  title: string;
  titleHtml: string;
}

export interface DisplayOptions {
  renderAllChildren?: boolean;
}

export function formatDisplayNode(searchResult: SearchResultItem, options?: DisplayOptions): HitsDisplayNode {
  const { document, highlights } = searchResult;

  const idHighlightWords = [...new Set([...(highlights?.id ?? []), ...(highlights?.["children/Id"] ?? [])]?.flatMap(extractBoldElements))];
  const titleHighlightWords = [...new Set((highlights?.title ?? [])?.flatMap(extractBoldElements))];
  const childTitleHighlightWords = [...new Set((highlights?.["children/Title"] ?? [])?.flatMap(extractBoldElements))];
  const researcherWords = [...new Set((highlights?.["researchers/Name"] ?? [])?.flatMap(extractBoldElements))];
  const title = document.title.length ? document.title : "Untitled";
  const researchers = document.researchers.map(withDisplayName);
  const researchersString = researchers.map((r) => r.displayName).join(", ");
  const researchersHtml = getHighlightHtml(researcherWords, ["<mark>", "</mark>"], researchersString) ?? escapeHtml(researchersString);
  const idHtml = getHighlightHtml(idHighlightWords, ["<mark>", "</mark>"], document.id) ?? document.id;

  const childrenIds = options?.renderAllChildren ? outlineChildrenIds(document.outline) : [];

  return {
    title,
    titleHtml: getHighlightHtml(titleHighlightWords, ["<mark>", "</mark>"], document.title) ?? escapeHtml(title),
    id: document.id,
    idHtml: idHtml,
    entityType: document.entityType,
    updatedOn: getUpdatedOn(document),
    researchers,
    researchersHtml,
    showAllChildren: options?.renderAllChildren,
    children: searchResult.document.children
      .filter(isClaimType)
      .filter((claim) => Boolean(claim.title))
      .sort((a, b) => childrenIds.indexOf(a.id) - childrenIds.indexOf(b.id))
      .map((claim) => {
        const childTitle = claim.title?.trim()?.length ? claim.title.trim() : "Untitled";
        const childTitleHtml = getHighlightHtml(childTitleHighlightWords, ["<mark>", "</mark>"], childTitle) ?? escapeHtml(childTitle);
        const childIdHtml = getHighlightHtml(idHighlightWords, ["<mark>", "</mark>"], claim.id) ?? claim.id;

        return {
          title: childTitle,
          titleHtml: childTitleHtml,
          id: claim.id,
          idHtml: childIdHtml,
          hasHighlight: childTitle !== childTitleHtml || claim.id !== childIdHtml,
          entityType: claim.entityType,
          isNative: claim.isNative,
        };
      })
      .filter(uniqueById),
  };
}

export const isClaimType = (item: { entityType: number }) => [EntityType.Insight, EntityType.Recommendation].includes(item.entityType);

const uniqueById = getUniqueFilter<{ id: any }>((a, b) => a.id === b.id);

const extractBoldElements = (html: string) => getHighlightWords(/<b>(.*?)<\/b>/g, html);

/**
 * Escape HTML entities for display
 */
export function escapeHtml(html: string): string {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getUpdatedOn(document: SearchResultDocument): Date {
  return [...document.children.map((child) => new Date(child.updatedOn)), new Date(document.updatedOn)] // Parent usually has latest timestamp
    .sort((a, b) => a.getTime() - b.getTime()) // Ascending because the array above is likely partially ascending
    .pop()!; // most recent date
}

function withDisplayName(namedEntity: { id: number; name: string }) {
  return {
    id: namedEntity.id,
    displayName: namedEntity.name,
  };
}

function outlineChildrenIds(outline: string): string[] {
  try {
    const children = (JSON.parse(outline) as SearchResultOutline).children;
    console.log("Outline", children);
    return children
      .filter((c) => c.id)
      .flatMap(getPreorderTraversalIds)
      .map((id) => id.toString());
  } catch (e) {
    console.error(`Error parsing outline`, e);
    return [];
  }
}

function getPreorderTraversalIds(node: SearchResultOutlineChild): number[] {
  return [node.id, ...(node.children || []).flatMap(getPreorderTraversalIds)];
}
