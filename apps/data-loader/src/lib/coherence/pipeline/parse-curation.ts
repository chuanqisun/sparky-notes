import { EntityName } from "../../hits/entity";
import { responseToList } from "../../hits/format";
import type { AggregatedItem } from "./semantic-search";

export interface CuratedGroup {
  name: string;
  intro: string;
  items: {
    text: string;
    sources: CuratedSource[];
    unknownSources: number[];
  }[];
}

export interface CuratedSource {
  pos: number;
  url: string;
  title: string;
  rootTitle: string;
}

export interface ParsedCuration {
  groups: CuratedGroup[];
  usedFootNotePositions: number[];
  unusedFootNotePositions: number[];
  unknownFootNotePositions: number[];
  footnotes: CuratedSource[];
}

export function parseCuration(aggregatedItems: AggregatedItem[], curationResponse: string): ParsedCuration {
  const footnotes = aggregatedItems.map((item, index) => ({
    pos: index + 1,
    title: item.title,
    rootTitle: item.rootTitle,
    url: `https://hits.microsoft.com/${EntityName[item.entityType]}/${item.id}`,
  }));

  /**
   * Input format
   *
   * Group K: <Title>
   * Intro: <Intro>
   * Findings:
   * - <Text> <Citation>
   * ...
   *
   * Group K+1: ...
   */

  const rawGroups = [...curationResponse.matchAll(/Group \d:.+(\n)+Intro:.+(\n)+Findings:\n(- .*\n)+/gm)].map((match) => match[0]);
  const parsedGroups = rawGroups
    .map((rawGroup) => rawGroup.match(/Group \d:(.+)(\n)+Intro:(.+)(\n)+Findings:\n((- .*\n)+)/m))
    .map((match) => ({
      name: match![1].trim(),
      intro: match![3].trim(),
      items: responseToList(match![5].trim()).listItems.map((item) => parseCitations(item)),
    }));

  const correlatedGroups: CuratedGroup[] = parsedGroups.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      sources: item.citations.map((citation) => footnotes.find((note) => note.pos === citation)).filter(Boolean) as CuratedSource[],
      unknownSources: item.citations.filter((citation) => !footnotes.find((note) => note.pos === citation)).sort(),
    })),
  }));

  const unknownSources = new Set(correlatedGroups.flatMap((group) => group.items.flatMap((item) => item.unknownSources)));

  const usedFootNotePositions = new Set<number>();
  for (const group of correlatedGroups) {
    for (const item of group.items) {
      for (const source of item.sources) {
        usedFootNotePositions.add(source.pos);
      }
    }
  }
  const unusedFootNotePositions = footnotes.map((note) => note.pos).filter((pos) => !usedFootNotePositions.has(pos));

  return {
    groups: correlatedGroups,
    usedFootNotePositions: [...usedFootNotePositions],
    unusedFootNotePositions: [...unusedFootNotePositions],
    unknownFootNotePositions: [...unknownSources],
    footnotes,
  };
}

function parseCitations(line: string): { text: string; citations: number[] } {
  // account for different citation styles
  // text [1,2,3]
  // text [1, 2, 3]
  // text [1][2][3]
  // text [1] [2] [3]
  // text [1],[2],[3]
  // text [1], [2], [3]
  // text [1].
  // text [1]?
  // text [1]!
  const match = line.trim().match(/^(.+?)((\[((\d|,|\s)+)\],?\s*)+)(\.|\?|!)?$/);
  if (!match) {
    return { text: line.trim(), citations: [] };
  }

  // regex, replace anything that is not a digit with space
  const citations = (match[2] ?? "")
    .replaceAll(/[^\d]/g, " ")
    .split(" ")
    .map((item) => parseInt(item))
    .filter(Boolean);

  const text = match[1].trim() + (match.at(-1) ?? "").trim();

  return {
    text,
    citations,
  };
}
