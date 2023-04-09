import type { CompletionErrorItem, CompletionInfoItem, LogEntry } from "@impromptu/types";
import "./log-entry-view.css";

export function LogEntryView(props: { entry: LogEntry }) {
  const { entry } = props;

  let summaryTitle = "";
  let InnerDetails: any;

  if (entry.data.prompt) {
    summaryTitle = entry.data.title;
    InnerDetails = (
      <>
        <span class="log__prompt">{entry.data.prompt}</span>
        <span class="log__completion">{(entry.data as CompletionInfoItem).completion ?? (entry.data as CompletionErrorItem).error}</span>
      </>
    );
  } else if (entry.data.title) {
    const data = entry.data;
    summaryTitle = data.title;
    InnerDetails = (
      <>
        <span class="log__text">{data.message}</span>
      </>
    );
  }

  return (
    <details>
      <summary title={summaryTitle}>
        {new Date(entry.timestamp).toLocaleTimeString()} {summaryTitle}
      </summary>
      {InnerDetails}
    </details>
  );
}
