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

export const EntityDisplayName: Record<number, string> = {
  1: "Insight",
  2: "Study",
  25: "Recommendation",
  32: "Collection",
  64: "Note",
};

export const EntityIcon: Record<number, string> = {
  1: lightbulbIconUrl,
  2: documentIconUrl,
  25: thumbupIconUrl,
  32: documentIconUrl,
  64: documentIconUrl,
};

export const EntityBackgroundColor: Record<number, string> = {
  1: "#ffd966",
  2: "#e6e6e6",
  25: "#80caff",
  32: "#e6e6e6",
  64: "#e6e6e6",
};
