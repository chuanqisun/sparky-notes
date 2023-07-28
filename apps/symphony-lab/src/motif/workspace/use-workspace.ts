import { useState } from "react";

interface AppState<T> {
  activeTabIndex: number;
  tabs: Tab<T>[];
}

export interface Tab<T> {
  states: T[];
  activeStateIndex: number;
}

export function useWorkspace<T>(initialState: T) {
  const [appState, setAppState] = useState<AppState<T>>({
    activeTabIndex: 0,
    tabs: [
      {
        states: [initialState],
        activeStateIndex: 0,
      },
    ],
  });

  /** Tabs are independent. Updating one should not affect others */
  const replaceTab = (updateFn: (tab: Tab<T>) => Tab<T>) => {
    setAppState((appState) => {
      const mutableTabs = appState.tabs.slice();
      const activeTab = mutableTabs[appState.activeTabIndex];
      const newTab = updateFn(activeTab);
      mutableTabs[appState.activeTabIndex] = newTab;
      return { ...appState, tabs: mutableTabs };
    });
  };

  const insertAfterActiveTab = (updateFn: (activeTab: Tab<T>) => Tab<T>) => {
    setAppState((appState) => {
      const mutableTabs = appState.tabs.slice();
      const activeTab = mutableTabs[appState.activeTabIndex];
      const newTab = updateFn(activeTab);
      mutableTabs.splice(appState.activeTabIndex + 1, 0, newTab);
      return { ...appState, tabs: mutableTabs, activeTabIndex: appState.activeTabIndex + 1 };
    });
  };

  const duplicateActiveTab = () => insertAfterActiveTab((activeTab) => ({ ...activeTab }));

  const appendTab = (initialState: T) => {
    setAppState((appState) => {
      const newTab: Tab<T> = {
        states: [initialState],
        activeStateIndex: 0,
      };

      const newTabs = [...appState.tabs, newTab];
      const lastIndex = newTabs.length - 1;
      return { activeTabIndex: lastIndex, tabs: newTabs };
    });
  };

  const openTab = (index: number) => {
    setAppState((appState) => {
      if (index < 0 || index >= appState.tabs.length) {
        return appState;
      }
      return { ...appState, activeTabIndex: index };
    });
  };

  /** States are causally linked. Updating a state should destroy subsequent states */
  const replaceState = (updateFn: (state: T) => T) => {
    replaceTab((tab) => {
      const mutableStates = tab.states.slice(0, tab.activeStateIndex + 1);
      const activeState = mutableStates[tab.activeStateIndex];
      const newState = updateFn(activeState);
      mutableStates[tab.activeStateIndex] = newState;
      return { ...tab, states: mutableStates };
    });
  };

  const pushState = (updateFn: (state: T) => T) => {
    replaceTab((tab) => {
      const mutableStates = tab.states.slice(0, tab.activeStateIndex + 1);
      const activeState = mutableStates[tab.activeStateIndex];
      const newState = updateFn(activeState);
      mutableStates.push(newState);
      return { ...tab, states: mutableStates, activeStateIndex: mutableStates.length - 1 };
    });
  };

  const tabs = appState.tabs;
  const activeTab = appState.tabs[appState.activeTabIndex];
  const activeState = activeTab.states[activeTab.activeStateIndex];

  return {
    appendTab,
    duplicateActiveTab,
    openTab,
    pushState,
    replaceState,
    activeState,
    activeTab,
    tabs,
  };
}
