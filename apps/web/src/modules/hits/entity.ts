import type { JSX } from "preact";
import { DocumentIcon } from "./assets/document-icon";
import { LightbulbIcon } from "./assets/lightbulb-icon";
import { ThumbupIcon } from "./assets/thumbup-icon";

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

export const EntityIconComponent: Record<number, () => JSX.Element> = {
  1: LightbulbIcon,
  2: DocumentIcon,
  25: ThumbupIcon,
  32: DocumentIcon,
  64: DocumentIcon,
};

export const EntityBackgroundColor: Record<number, string> = {
  1: "#ffd966",
  2: "#e6e6e6",
  25: "#80caff",
  32: "#e6e6e6",
  64: "#e6e6e6",
};
