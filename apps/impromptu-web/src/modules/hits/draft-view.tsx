import { PrimaryDataNodeSummary } from "@impromptu/types";
import MarkdownIt from "markdown-it";
import { useCallback, useMemo, useState } from "preact/hooks";
import { notifyFigma, requestFigma } from "../figma/rpc";
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

export interface StickyConfig {
  depth?: number;
  innerText?: string;
  url?: string;
  text: string;
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

  const formatClaimSticky = useCallback((config: StickyConfig) => {
    const { depth, url, text, innerText } = config;
    const indent = "  ".repeat(depth ?? 0);
    const wrapWithUrl = (text: string) => (url ? `[${text}](${url})` : text);
    const innerTextSuffix = innerText ? `\n\n${indent}  ${wrapWithUrl(innerText)}` : "";

    if (url?.match(/^https:\/\/hits\.microsoft\.com\/insight/i)) {
      return `${indent}- [**Insight**](${url}) ${text}`;
    } else if (url?.match(/^https:\/\/hits\.microsoft\.com\/recommendation/i)) {
      return `${indent}- [**Recommendation**](${url}) ${text}`;
    } else if (url) {
      return `${indent}- **Insight** ${text}${innerTextSuffix}`;
    } else {
      return `${indent}- **Insight** ${text}${innerTextSuffix}`;
    }
  }, []);

  const reportMd = useMemo(() => {
    const lines: string[] = [];
    const reducerContext = {
      lines,
      parentInsightDepth: 0,
    };

    primaryDataNode?.orderedStickies.reduce((context, sticky) => {
      switch (sticky.color) {
        case "Green":
          context.lines.push(formatClaimSticky({ text: sticky.text, url: sticky.url, innerText: sticky.childText }));
          return {
            ...context,
            parentInsightDepth: 1,
          };
        case "Yellow":
          context.lines.push(formatClaimSticky({ depth: context.parentInsightDepth, text: sticky.text, url: sticky.url }));
          return context;
        case "LightGray":
          context.lines.push(sticky.url ? `[${sticky.text}](${sticky.url})` : sticky.text);
          return context;
        default:
          return context;
      }
    }, reducerContext);

    return lines.join("\n\n").trim();
  }, [primaryDataNode]);

  const reportHtml = useMemo(() => {
    if (!reportMd) return "";
    const previewSourceMd = `
# _\<Title of The Report\>_

## Introduction

_\<An introduction for the following content\>_

${reportMd
  .split("\n")
  .map((line) => (line.startsWith("# ") ? `#${line}` : line))
  .join("\n")}

## Methodology

_\<A description of how the report is generated\>_
    `.trim();
    return md.render(previewSourceMd);
  }, [reportMd]);

  const handleExport = useCallback(async () => {
    if (primaryDataNode) {
      try {
        notifyFigma({ stop: true });

        setIsCreating(true);
        const synthesis = await handleRequestSynthesis(primaryDataNode.id);
        if (synthesis.error) throw new Error(synthesis.error);
        const fullReportMd = `
## Introduction

${synthesis.introduction}

${reportMd}

${synthesis.methodology ? `# Methodology` : ""}

${synthesis.methodology}
        `.trim();
        notifyFigma({ showNotification: { message: `Creating draft...`, config: { timeout: Infinity } } });
        const result = await handleExportAsHitsReport({ title: synthesis.title!, markdown: fullReportMd });
        window.open(result.url, "_blank");
        setCreationResults((prev) => [{ title: synthesis.title!, url: result.url, timestamp: new Date() }, ...prev]);
        notifyFigma({ showNotification: { message: `✅ The draft was successful created!` } });
      } catch (e: any) {
        setCreationResults((prev) => [{ title: primaryDataNode.name, timestamp: new Date(), error: `${e.name} ${e.message}` }, ...prev]);
        notifyFigma({ showNotification: { message: `Something went wrong while creating the draft`, config: { error: true } } });
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
      {primaryDataNode ? (
        <menu>
          <button
            onClick={handleExport}
            title="Compile stickies into a HITS draft report, with Green stickies becoming headings, yellow stickies insights, and gray stickies paragraph."
            disabled={isCreating || !primaryDataNode}
          >
            Create HITS Draft
          </button>
        </menu>
      ) : (
        <div>Select a section to export</div>
      )}
      {creationResults.length > 0 ? (
        <details open={true}>
          <summary>Output</summary>
          <ul class="draft-output-list ">
            {creationResults
              .filter((result) => result.url)
              .map((result) => (
                <li key={result.url}>
                  <div class="draft-output-item">
                    <a href={result.url} target="_blank">
                      {result.title}
                    </a>{" "}
                    <time>({result.timestamp.toLocaleTimeString()})</time>
                  </div>
                </li>
              ))}
          </ul>
          <ul class="draft-output-list ">
            {creationResults
              .filter((result) => result.error)
              .map((result, index) => (
                <li key={index}>
                  <div class="draft-output-item">
                    <span class="draft-output-item__error">
                      Error creating draft from "{result.title}" section: {result.error}
                    </span>{" "}
                    <time>({result.timestamp.toLocaleTimeString()})</time>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      ) : null}
      {primaryDataNode ? (
        <details>
          <summary>Preview</summary>
          <div class="md-preview" dangerouslySetInnerHTML={{ __html: reportHtml }} onClick={handlePreviewClick}></div>
        </details>
      ) : null}
    </>
  );
}
