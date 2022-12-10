import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import "./status-bar.css";

export interface StatusBarProps {
  lines: string[];
}

export function StatusBar(props: StatusBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    containerRef.current?.lastElementChild?.scrollIntoView();
  }, [props.lines, isExpanded]);

  return (
    <div class="c-status-bar" data-expanded={isExpanded} ref={containerRef} onClick={() => setIsExpanded((prev) => !prev)}>
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
