import { PrimaryDataNodeSummary } from "@impromptu/types";
import { useCallback, useMemo, useState } from "preact/hooks";
import "./draft-view.css";
import { ParsedReport } from "./parse-report";

export function DraftView(props: { draft: ParsedReport | null }) {
  const { draft } = props;
  return (
    <>
      {draft?.title ? (
        <details>
          <summary>{draft.title}</summary>
          {draft.markdown}
        </details>
      ) : null}
      {draft?.error ? <div class="draft-error">{draft.error}</div> : null}
    </>
  );
}

export interface DraftViewProps {
  primaryDataNode: PrimaryDataNodeSummary | null;
  isCreating: boolean;

  onExport: (exportedReport: { title: string; markdown: string }) => any;
}
export function DraftViewV2(props: DraftViewProps) {
  const { primaryDataNode, onExport, isCreating } = props;
  const [isExpanded, setIsExpanded] = useState(false);

  const reportText = useMemo(
    () =>
      `
  ${primaryDataNode?.orderedStickies
    .map((sticky) => {
      switch (sticky.color) {
        case "Green":
          return `# ${sticky.text}`;
        case "Yellow":
          return sticky.url ? `- [**Insight**](${sticky.url}) ${sticky.text}` : `- **Insight** ${sticky.text}`;
        case "LightGray":
          return `${sticky.text}`;
        default:
          return "";
      }
    })
    .join("\n\n")}`.trim(),
    [primaryDataNode]
  );

  const handleExport = useCallback(() => {
    if (primaryDataNode) {
      onExport({ title: primaryDataNode.name, markdown: reportText });
    }
  }, [primaryDataNode]);

  return (
    <>
      <menu>
        <button onClick={handleExport} title="Export markdown as a HITS draft report" disabled={isCreating || !primaryDataNode}>
          HITS draft report
        </button>
      </menu>
      {primaryDataNode ? (
        <details open={isExpanded}>
          <summary>{primaryDataNode.name}</summary>
          {reportText}
        </details>
      ) : null}
    </>
  );
}
