const { useSyncedState } = figma.widget;

export function useCopilotSwitch() {
  const [isCopilotEnabled, setIsCopilotEnabled] = useSyncedState<boolean>("isImpromptuEnabled", false);

  const enableCopilot = () => setIsCopilotEnabled(true);
  const disableCopilot = () => setIsCopilotEnabled(false);
  return { isCopilotEnabled, enableCopilot, disableCopilot };
}
