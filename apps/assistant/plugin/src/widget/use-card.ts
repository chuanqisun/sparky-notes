import type { CardData } from "@h20/assistant-types";
import Plus from "../assets/FigmaPlus.svg";
import figmaPalette from "../assets/figma-palette.json";

const { usePropertyMenu, useSyncedState } = figma.widget;

export interface UseWidgetStateProps {
  openIndexPage: () => void;
}

export function useWidgetState({ openIndexPage }: UseWidgetStateProps) {
  const [cardData, setCardData] = useSyncedState<CardData | null>("cardData", null);
  const [isCopilotEnabled, setIsCopilotEnabled] = useSyncedState<boolean>("isCopilotEnabled", false);

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

  return { cardData, isCopilotEnabled, setIsCopilotEnabled };
}
