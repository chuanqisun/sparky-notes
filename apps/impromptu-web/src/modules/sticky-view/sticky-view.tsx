import { StickySummary } from "@impromptu/types";

export function StickyView(props: { stickySummaries: StickySummary[] }) {
  return (
    <>
      {!props.stickySummaries.length && <div>Select stickies to inspect</div>}
      {props.stickySummaries.map((sticky) => (
        <details>
          <summary>{sticky.text}</summary>
          <dl>
            <dt>Display text</dt>
            <dd>{sticky.text}</dd>
            <dt>Link</dt>
            <dd>
              {sticky.url ? (
                <a href={sticky.url} target="_blank">
                  {sticky.url}
                </a>
              ) : (
                "N/A"
              )}
            </dd>
            <dt>Short context</dt>
            <dd>{sticky.shortContext.length ? sticky.shortContext : "N/A"}</dd>
            <dt>Long context</dt>
            <dd>{sticky.longContext.length ? sticky.longContext : "N/A"}</dd>
          </dl>
        </details>
      ))}
    </>
  );
}
