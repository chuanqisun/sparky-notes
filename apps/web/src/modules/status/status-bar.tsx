import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import "./status-bar.css";

export interface StatusBarProps {
  isExpanded?: boolean;
  lines: string[];
}

export function StatusBar(props: StatusBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.lastElementChild?.scrollIntoView();
  }, [props.lines]);

  return (
    <div class={`c-status-bar ${props.isExpanded ? "expanded" : ""}`} ref={containerRef}>
      {props.lines.map((line, index) => (
        <div class="c-status-bar__line" key={index}>
          {line}
        </div>
      ))}
    </div>
  );
}

export function useLog() {
  const [lines, setLines] = useState<string[]>([]);
  const log = useCallback((message: string) => setLines((prevLines) => [...prevLines, `${new Date().toLocaleTimeString()}\xa0 ${message}`]), []);

  return {
    log,
    lines,
  };
}
