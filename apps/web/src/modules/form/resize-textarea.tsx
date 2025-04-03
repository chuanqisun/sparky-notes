import type { JSX, Ref } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { triggerResize } from "./resize-to-fit";

export type ResizeTextareaProps = JSX.HTMLAttributes<HTMLTextAreaElement> & {
  wrapperClass?: string;
  class?: string;
  /** String only */
  value?: string;
  /** Forward ref  */
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** use `value` instead. Can't extract text from children  */
  children?: never;
};

export function ResizeTextarea(props: ResizeTextareaProps) {
  const { value, textareaRef: forwardRef, ...allowedProps } = props;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mergedOnInput = (e: JSX.TargetedInputEvent<HTMLTextAreaElement>) => {
    props.onInput?.(e);
    triggerResize(e);
  };

  // seems to be a preact bug. using value binding will cause the outdated value to be rendered into the UI
  useEffect(() => {
    if (!textareaRef.current) return;
    const currentValue = textareaRef.current.value;

    if (value !== currentValue) {
      textareaRef.current.value = value ?? "";
    }
  }, [value]);

  // manually forward ref
  useEffect(() => {
    if (!forwardRef) return;

    if (typeof forwardRef === "function") {
      forwardRef(textareaRef.current);
    } else {
      forwardRef.current = textareaRef.current;
    }
  }, [forwardRef]);

  return (
    <div data-resize-to-fit={value ?? ""} class={props.wrapperClass}>
      <textarea class={props.class} ref={textareaRef} {...allowedProps} onInput={mergedOnInput}></textarea>
    </div>
  );
}
