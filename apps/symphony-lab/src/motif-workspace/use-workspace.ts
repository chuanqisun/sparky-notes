import { useState } from "react";

interface AppState<T> {
  currentTabIndex: number;
  tabs: Tab<T>[];
}

export interface Tab<T> {
  states: T[];
  currentStateIndex: number;
}

export function useWorkspace<T>(initialState: T) {
  const [appState, setAppState] = useState<AppState<T>>({
    currentTabIndex: 0,
    tabs: [
      {
        states: [initialState],
        currentStateIndex: 0,
      },
    ],
  });

  /** Tabs are independent. Updating one should not affect others */
  const replaceTab = (updateFn: (tab: Tab<T>) => Tab<T>) => {
    setAppState((appState) => {
      const mutableTabs = appState.tabs.slice();
      const currentTab = mutableTabs[appState.currentTabIndex];
      const newTab = updateFn(currentTab);
      mutableTabs[appState.currentTabIndex] = newTab;
      return { ...appState, tabs: mutableTabs };
    });
  };

  const pushTab = (initialState: T) => {
    setAppState((appState) => {
      const newTab: Tab<T> = {
        states: [initialState],
        currentStateIndex: 0,
      };

      const newTabs = [...appState.tabs, newTab];
      const newIndex = appState.currentTabIndex + 1;
      return { currentTabIndex: newIndex, tabs: newTabs };
    });
  };

  const openTab = (index: number) => {
    setAppState((appState) => {
      if (index < 0 || index >= appState.tabs.length) {
        return appState;
      }
      return { ...appState, currentTabIndex: index };
    });
  };

  /** States are causally linked. Updating a state should destroy subsequent states */
  const replaceState = (updateFn: (state: T) => T) => {
    replaceTab((tab) => {
      const mutableStates = tab.states.slice(0, tab.currentStateIndex + 1);
      const currentState = mutableStates[tab.currentStateIndex];
      const newState = updateFn(currentState);
      mutableStates[tab.currentStateIndex] = newState;
      return { ...tab, states: mutableStates };
    });
  };

  const pushState = (updateFn: (state: T) => T) => {
    replaceTab((tab) => {
      const mutableStates = tab.states.slice(0, tab.currentStateIndex + 1);
      const currentState = mutableStates[tab.currentStateIndex];
      const newState = updateFn(currentState);
      mutableStates.push(newState);
      return { ...tab, states: mutableStates, currentStateIndex: mutableStates.length - 1 };
    });
  };

  const tabs = appState.tabs;
  const tab = appState.tabs[appState.currentTabIndex];
  const state = tab.states[tab.currentStateIndex];

  return {
    pushTab,
    openTab,
    pushState,
    replaceState,
    state,
    tab,
    tabs,
  };
}
