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
  64: "Customer Note",
};
