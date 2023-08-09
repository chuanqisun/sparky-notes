import type { CardData } from "@h20/assistant-types";
import Plus from "../assets/FigmaPlus.svg";
import figmaPalette from "../assets/figma-palette.json";

const { usePropertyMenu, useSyncedState } = figma.widget;

export interface UseCardMenuProps {
  openIndexPage: () => void;
}

export function useCard({ openIndexPage }: UseCardMenuProps) {
  const [cardData, setCardData] = useSyncedState<CardData | null>("cardData", null);

  usePropertyMenu(
    cardData
      ? [
          {
            icon: Plus,
            itemType: "action",
            propertyName: "add",
            tooltip: "New",
          },
          {
            itemType: "separator",
          },
          {
            itemType: "color-selector",
            propertyName: "backgroundColor",
            tooltip: "Background",
            selectedOption: cardData.backgroundColor,
            options: figmaPalette,
          },
        ]
      : [],
    ({ propertyName, propertyValue }) => {
      switch (propertyName) {
        case "backgroundColor":
          setCardData({ ...cardData!, backgroundColor: propertyValue! });
          break;
        case "add":
          return new Promise((_resolve) => openIndexPage());
      }
    }
  );

  return { cardData };
}
