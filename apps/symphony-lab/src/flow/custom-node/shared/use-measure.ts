import { useLayoutEffect, useRef, useState } from "react";

export interface Rect {
  width: number;
  height: number;
}
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [rect, setRect] = useState<Rect>();

  useLayoutEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect) {
        setRect({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(ref.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  return [ref, rect] as const;
}
