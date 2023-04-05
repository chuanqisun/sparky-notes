import { useCallback, useState } from "preact/hooks";
import { getCombo } from "../../utils/keyboard";

export interface UseInputFieldProps {
  onEnter: (text: string) => string | Promise<string>;
}
export function useInputField(props: UseInputFieldProps) {
  const [text, setText] = useState("");

  const handleInput = useCallback((e: Event) => setText((e.target as HTMLInputElement).value), []);

  const handleKeydown = useCallback(
    async (e: Event) => {
      if (getCombo(e as KeyboardEvent) === "enter") {
        e.preventDefault();
        const updatedText = await props.onEnter((e.target as HTMLInputElement).value);
        setText(updatedText);
      }
    },
    [props.onEnter]
  );

  return {
    text,
    handleKeydown,
    handleInput,
  };
}
