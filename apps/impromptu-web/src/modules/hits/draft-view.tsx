import { PrimaryDataNodeSummary } from "@impromptu/types";
import MarkdownIt from "markdown-it";
import { useCallback, useMemo, useState } from "preact/hooks";
import { requestFigma } from "../figma/rpc";
import { createReport } from "./create-report";
import "./draft-view.css";
import { getHITSApiProxy } from "./proxy";

const md = new MarkdownIt();

export interface DraftViewProps {
  primaryDataNode: PrimaryDataNodeSummary | null;
  accessToken: string;
}

export interface CreationResult {
  url?: string;
  title: string;
  error?: string;
  timestamp: Date;
}

export function DraftViewV2(props: DraftViewProps) {
  const { primaryDataNode, accessToken } = props;
  const hitsApi = useMemo(() => getHITSApiProxy(accessToken), [accessToken]);

  const [isCreating, setIsCreating] = useState(false);
  const [creationResults, setCreationResults] = useState<CreationResult[]>([]);

  const handleExportAsHitsReport = useCallback(
    async (draft: { title: string; markdown: string }) => {
      const result = await createReport(hitsApi, {
        report: {
          title: draft.title,
          markdown: draft.markdown,
        },
      });

      return result;
    },
    [hitsApi]
  );

  const handleRequestSynthesis = useCallback(async (dataNodeId: string) => {
    const { respondDataNodeSynthesis } = await requestFigma({
      requestDataNodeSynthesis: {
        dataNodeId,
        title: true,
        introduction: true,
        methodology: true,
      },
    });
    return respondDataNodeSynthesis!;
  }, []);

  const reportMd = useMemo(
    () =>
      `
  ${primaryDataNode?.orderedStickies
    .map((sticky) => {
      switch (sticky.color) {
        case "Green":
          const title = `# ${sticky.text}`;
          const context = sticky.childText;
          return `${title}${context ? `\n\n${context}` : ""}`;
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
    const previewSourceMd = `
# _\<Title of The Report\>_

## Introduction

_\<An introduction paragraph\>_

${reportMd
  .split("\n")
  .map((line) => (line.startsWith("# ") ? `#${line}` : line))
  .join("\n")}

## Methodology

_\<Methodology description\>_
    `.trim();
    return md.render(previewSourceMd);
  }, [reportMd]);

  const handleExport = useCallback(async () => {
    if (primaryDataNode) {
      try {
        setIsCreating(true);
        const synthesis = await handleRequestSynthesis(primaryDataNode.id);
        const fullReportMd = `
## Introduction

${synthesis.introduction}

${reportMd}

# Methodology

${synthesis.methodology}
        `.trim();
        const result = await handleExportAsHitsReport({ title: synthesis.title!, markdown: fullReportMd });
        window.open(result.url, "_blank");
        setCreationResults((prev) => [...prev, { title: synthesis.title!, url: result.url, timestamp: new Date() }]);
      } catch (e: any) {
        setCreationResults((prev) => [
          ...prev,
          { title: `Synthetic report from ${primaryDataNode.name}`, timestamp: new Date(), error: `${e.name} ${e.message}` },
        ]);
      } finally {
        setIsCreating(false);
      }
    }
  }, [reportMd, primaryDataNode]);

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
        <button
          onClick={handleExport}
          title="Compile stickies into a HITS draft report, with Green stickies becoming headings, yellow stickies insights, and gray stickies paragraph."
          disabled={isCreating || !primaryDataNode}
        >
          Create HITS Draft
        </button>
      </menu>
      {primaryDataNode ? (
        <details>
          <summary>Preview</summary>
          <div class="md-preview" dangerouslySetInnerHTML={{ __html: reportHtml }} onClick={handlePreviewClick}></div>
        </details>
      ) : null}
    </>
  );
}
