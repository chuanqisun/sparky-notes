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
