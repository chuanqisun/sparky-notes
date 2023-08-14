import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { EntityDisplayName, EntityIconComponent, EntityName } from "./entity";
import "./report-viewer.css";
import type { ReportDetails } from "./use-report-details";

export interface ReportViewerProps {
  className?: string;
  report: ReportDetails;
}

export function ReportViewer(props: ReportViewerProps) {
  const { report } = props;

  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  const highlightedId = report.isHighlighted ? report.entityId : report.children.find((child) => child.isHighlighted)?.entityId ?? null;

  // Auto expand highlighted child entity
  useEffect(() => {
    const accordion = document.querySelector<HTMLElement>(`[data-entity-id="${highlightedId}"]`);
    if (!accordion) return;

    accordion.setAttribute("data-open", "true");
    accordion.querySelector(".js-accordion-scroll-center")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightedId]);

  return (
    <>
      <article class={`${props.className} c-card-article`}>
        {report.tags ? (
          <ul class="c-tag-list">
            {report.tags.map((tag) => (
              <li key={tag.url}>
                <a class="c-tag" target="_blank" href={tag.url}>
                  {tag.displayName}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <h1 class="c-card-title" data-highlight={report.isHighlighted}>
          {report.title}
        </h1>
        <p class="c-card-byline">
          {EntityDisplayName[report.entityType]} ·{" "}
          <a class="c-card-meta-link" href={report.group.url} target="_blank">
            {report.group.displayName}
          </a>{" "}
          ·{" "}
          {report.researchers.map((researcher, index) => (
            <Fragment key={researcher.url}>
              {index > 0 ? ", " : ""}
              <a class="c-card-meta-link" href={researcher.url} target="_blank">
                {researcher.displayName}
              </a>
            </Fragment>
          ))}{" "}
          · {report.updatedOn.toLocaleString()}
        </p>
        <button class="u-reset" onClick={() => setIsBodyExpanded((prev) => !prev)}>
          <p class="c-card-body">
            <span class="c-card-body__visible" data-overflow={!isBodyExpanded && !!report.bodyOverflow}>
              {report.body}
            </span>
            {isBodyExpanded && report.bodyOverflow && <span> {report.bodyOverflow}</span>}
          </p>
        </button>
        <ul class="c-child-entity-list">
          {report.children.map((child) => (
            <li key={child.entityId}>
              <div class="c-child-accordion__container" data-entity-id={child.entityId} data-has-details={child.body.length > 0}>
                <div class="c-child-accordion__title">
                  {EntityIconComponent[child.entityType]()}
                  <span class="js-accordion-scroll-center c-child-title" data-highlight={child.isHighlighted}>
                    {child.title}
                  </span>
                </div>
                {child.body.length ? <p class="c-child-details">{child.body}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <a class="c-card-full-report-link" target="_blank" href={`https://hits.microsoft.com/${EntityName[report.entityType]}/${report.entityId}`}>
          Full report
        </a>
      </article>
    </>
  );
}
