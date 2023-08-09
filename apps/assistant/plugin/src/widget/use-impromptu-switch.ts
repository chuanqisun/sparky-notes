const { useSyncedState } = figma.widget;

export function useImpromptuSwitch() {
  const [isImpromptuEnabled, setIsImpromptuEnabled] = useSyncedState<boolean>("isImpromptuEnabled", false);

  const enableImpromptu = () => setIsImpromptuEnabled(true);
  return { isImpromptuEnabled, enableImpromptu };
}
