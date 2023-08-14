import { Fragment } from "preact";
import { useState } from "preact/hooks";
import { EntityDisplayName, EntityIconComponent, EntityName } from "./entity";
import "./report-viewer.css";

export interface ReportViewerProps {
  class?: string;
  entityId: null | string;
  report: ReportDetails;
}

export interface ReportDetails {
  title: string;
  body: string;
  bodyOverflow: string;
  entityId: string;
  entityType: number;
  updatedOn: Date;
  tags: {
    displayName: string;
    url: string;
  }[];
  children: {
    entityId: string;
    entityType: number;
    title: string;
    body: string;
  }[];
  group: {
    displayName: string;
    url: string;
  };
  researchers: {
    displayName: string;
    url: string;
  }[];
}

export function ReportViewer(props: ReportViewerProps) {
  const { report, entityId } = props;

  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  return (
    <article class={`${props.class} c-card-article`}>
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
      <h1 class="c-card-title" data-highlight={report.entityId === entityId}>
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
            <details class="c-child-accordion__container" data-entity-id={child.entityId} data-has-details={child.body.length > 0}>
              <summary class="c-child-accordion__title">
                {EntityIconComponent[child.entityType]()}
                <span class="c-child-title" data-highlight={child.entityId === entityId}>
                  {child.title}
                </span>
              </summary>
              {child.body.length ? <p class="c-child-details">{child.body}</p> : null}
            </details>
          </li>
        ))}
      </ul>
      <a class="c-card-full-report-link" target="_blank" href={`https://hits.microsoft.com/${EntityName[report.entityType]}/${report.entityId}`}>
        Full report
      </a>
    </article>
  );
}
