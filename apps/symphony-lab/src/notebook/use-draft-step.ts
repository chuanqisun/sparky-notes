import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { getCombo } from "../utils/keyboard";

export interface UseDraftTaskProps {
  onSubmit?: (text: string) => any;
}
export function useDraftStep(props: UseDraftTaskProps) {
  const [draftStep, setDraftStep] = useState({ isDrafting: false, text: "" });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const handleKeydown = useCallback(
    (e: Event) => {
      if (getCombo(e as KeyboardEvent) === "enter") {
        e.preventDefault();
        props?.onSubmit?.((e.target as HTMLTextAreaElement).value);
        setDraftStep({ isDrafting: false, text: "" });
      }
    },
    [props?.onSubmit]
  );
  const start = useCallback(() => setDraftStep((prev) => ({ ...prev, isDrafting: true })), []);
  const handleInput = useCallback((e: Event) => setDraftStep((task) => ({ ...task, text: (e.target as HTMLTextAreaElement)!.value })), []);
  const handleBlur = useCallback((e: Event) => setDraftStep((task) => ({ ...task, isDrafting: false })), []);

  useEffect(() => inputRef.current?.focus(), [draftStep.isDrafting]);

  return {
    isDrafting: draftStep.isDrafting,
    draftStepText: draftStep.text,
    draftStepInputRef: inputRef,
    startDrafting: start,
    handleDraftStepKeydown: handleKeydown,
    handleDraftStepInput: handleInput,
    handleDraftStepBlur: handleBlur,
  };
}
