const { useSyncedState } = figma.widget;

export function useCopilotSwitch() {
  const [isCopilotEnabled, setIsCopilotEnabled] = useSyncedState<boolean>("isCopilotEnabled", false);

  const enableCopilot = () => setIsCopilotEnabled(true);
  const disableCopilot = () => setIsCopilotEnabled(false);
  return { isCopilotEnabled, enableCopilot, disableCopilot };
}
