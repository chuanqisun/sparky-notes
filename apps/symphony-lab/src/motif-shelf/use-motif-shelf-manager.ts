import { useState } from "react";

interface AppState {
  currentShelfIndex: number;
  shelves: MotifShelf[];
}

export interface MotifShelf {
  source: string;
  data: any[];
}

export function useMotifShelfManager() {
  const [shelfState, setShelfState] = useState<AppState>({
    currentShelfIndex: 0,
    shelves: [
      {
        source: "",
        data: [],
      },
    ],
  });

  const updateCurrentShelf = (updateFn: (shelf: MotifShelf) => MotifShelf) => {
    setShelfState((shelfState) => {
      const remainingShelves = shelfState.shelves.slice(0, shelfState.currentShelfIndex + 1);
      const currentShelf = remainingShelves[shelfState.currentShelfIndex];
      const newShelf = updateFn(currentShelf);
      remainingShelves[shelfState.currentShelfIndex] = newShelf;
      return { ...shelfState, shelves: remainingShelves };
    });
  };

  const addShelf = (shelf: MotifShelf) => {
    setShelfState((shelfState) => {
      const newShelfList = [...shelfState.shelves, shelf];
      const newIndex = shelfState.currentShelfIndex + 1;
      return { currentShelfIndex: newIndex, shelves: newShelfList };
    });
  };

  const openShelf = (index: number) => {
    setShelfState((shelfState) => {
      if (index < 0 || index >= shelfState.shelves.length) {
        return shelfState;
      }
      return { ...shelfState, currentShelfIndex: index };
    });
  };

  const shelves = shelfState.shelves;
  const currentShelf = shelfState.shelves[shelfState.currentShelfIndex];
  const userMessage = currentShelf.source;

  const updateUserMessage = (userMessage: string) => {
    updateCurrentShelf((shelf) => ({ ...shelf, source: userMessage }));
  };

  const updateShelfData = (data: any[]) => {
    updateCurrentShelf((shelf) => ({ ...shelf, data }));
  };

  return {
    addShelf,
    currentShelf,
    openShelf,
    shelves,
    updateShelfData,
    updateUserMessage,
    userMessage,
  };
}
