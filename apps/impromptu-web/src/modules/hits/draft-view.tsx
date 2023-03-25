import { PrimaryDataNodeSummary } from "@impromptu/types";
import MarkdownIt from "markdown-it";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import "./draft-view.css";

const md = new MarkdownIt();

export interface DraftViewProps {
  primaryDataNode: PrimaryDataNodeSummary | null;
  isCreating: boolean;
  creationResults: CreationResult[];
  onExport: (exportedReport: { title: string; markdown: string }) => any;
}

export interface CreationResult {
  url?: string;
  title: string;
  error?: string;
  timestamp: Date;
}

export function DraftViewV2(props: DraftViewProps) {
  const { primaryDataNode, onExport, isCreating, creationResults } = props;
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
  }, [draftTitle, reportMd, primaryDataNode]);

  const handlePreviewClick = useCallback<EventListener>((e: Event) => {
    const maybeLink = (e.target as HTMLElement).closest?.("a");
    if (maybeLink) {
      e.preventDefault();
      window.open(maybeLink.href, "_blank");
    }
  }, []);

  return (
    <>
      <ul class="draft-result-list">
        {creationResults
          .filter((result) => result.url)
          .map((result) => (
            <li key={result.url}>
              <a href={result.url} target="_blank">
                {result.title}
              </a>
              {" | "}
              Draft created at {result.timestamp.toLocaleTimeString()}
            </li>
          ))}
      </ul>
      <ul class="draft-error-list">
        {creationResults
          .filter((result) => result.error)
          .map((result, index) => (
            <li key={index}>
              {result.title} | Failed with {result.error} at {result.timestamp.toLocaleTimeString()}
            </li>
          ))}
      </ul>
      <menu>
        <button onClick={handleExport} title="Export markdown as a HITS draft report" disabled={isCreating || !primaryDataNode}>
          Create HITS Draft
        </button>
        {primaryDataNode ? (
          <input type="text" value={draftTitle} disabled={isCreating} onChange={(e) => setDraftTitle((e.target as HTMLInputElement).value)} />
        ) : null}
      </menu>
      {primaryDataNode ? (
        <details open={isExpanded}>
          <summary>Preview</summary>
          <div class="md-preview" dangerouslySetInnerHTML={{ __html: reportHtml }} onClick={handlePreviewClick}></div>
        </details>
      ) : null}
    </>
  );
}
