import documentIconUrl from "./assets/Document.svg";
import lightbulbIconUrl from "./assets/Lightbulb.svg";
import thumbupIconUrl from "./assets/Thumbup.svg";

export const EntityType = {
  Insight: 1,
  Study: 2,
  Recommendation: 25,
  Collection: 32,
  Note: 64,
};

export const EntityName: Record<number, string> = {
  1: "insight",
  2: "study",
  25: "recommendation",
  32: "collection",
  64: "note",
};

export const EntityIcon: Record<number, string> = {
  1: lightbulbIconUrl,
  2: documentIconUrl,
  25: thumbupIconUrl,
  32: documentIconUrl,
  64: documentIconUrl,
};
