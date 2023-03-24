import { PrimaryDataNodeSummary } from "@impromptu/types";
import MarkdownIt from "markdown-it";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./draft-view.css";
import { ParsedReport } from "./parse-report";

const md = new MarkdownIt();

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

  const [draftTitle, setDraftTitle] = useState("New report");

  useEffect(() => {
    if (primaryDataNode) {
      setDraftTitle(primaryDataNode.name);
    }
  }, [primaryDataNode]);

  const reportMd = useMemo(
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

  const reportHtml = useMemo(() => {
    if (!reportMd) return "";
    return md.render(reportMd);
  }, [reportMd]);

  const handleExport = useCallback(() => {
    if (primaryDataNode) {
      onExport({ title: draftTitle, markdown: reportMd });
    }
  }, [primaryDataNode]);

  return (
    <>
      <menu>
        <button onClick={handleExport} title="Export markdown as a HITS draft report" disabled={isCreating || !primaryDataNode}>
          As HITS Draft
        </button>
        {primaryDataNode ? <input type="text" value={draftTitle} onChange={(e) => setDraftTitle((e.target as HTMLInputElement).value)} /> : null}
      </menu>
      {primaryDataNode ? (
        <details open={isExpanded}>
          <summary>Preview</summary>
          <div class="md-preview" dangerouslySetInnerHTML={{ __html: reportHtml }}></div>
        </details>
      ) : null}
    </>
  );
}
