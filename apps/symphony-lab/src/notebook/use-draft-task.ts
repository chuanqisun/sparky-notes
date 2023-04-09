import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { getCombo } from "../utils/keyboard";

export interface UseDraftTaskProps {
  onSubmit?: (text: string) => any;
}
export function useDraftTask(props: UseDraftTaskProps) {
  const [draftTask, setDraftTask] = useState({ isDrafting: false, text: "" });
  const draftTaskInputRef = useRef<HTMLTextAreaElement>(null);
  const handleDraftTaskKeydown = useCallback((e: Event) => {
    if (getCombo(e as KeyboardEvent) === "enter") {
      e.preventDefault();
      props?.onSubmit?.((e.target as HTMLTextAreaElement).value);
      setDraftTask({ isDrafting: false, text: "" });
    }
  }, []);
  const addDraftTask = useCallback(() => setDraftTask({ isDrafting: true, text: "" }), []);
  const handleDraftTaskInput = useCallback((e: Event) => setDraftTask((task) => ({ ...task, text: (e.target as HTMLTextAreaElement)!.value })), []);
  const handleDraftTaskBlur = useCallback((e: Event) => setDraftTask((task) => ({ ...task, isDrafting: false })), []);

  useEffect(() => draftTaskInputRef.current?.focus(), [draftTask.isDrafting]);

  return {
    isDrafting: draftTask.isDrafting,
    draftTask: draftTask.text,
    draftTaskInputRef,
    addDraftTask,
    handleDraftTaskKeydown,
    handleDraftTaskInput,
    handleDraftTaskBlur,
  };
}
