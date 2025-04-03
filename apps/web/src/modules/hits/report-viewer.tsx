import type { CardData } from "@h20/assistant-types";
import { Fragment } from "preact";
import { useEffect, useState } from "preact/hooks";
import { isFigmaWebDragEnd } from "../../utils/drag-and-drop";
import { EntityDisplayName, EntityIconComponent } from "./entity";
import { entityToCard } from "./entity-to-card";
import { getEntityUrl } from "./get-entity-url";
import type { ReportDetails } from "./use-report-details";

export interface ReportViewerProps {
  className?: string;
  report: ReportDetails;
  onAddMultiple: (cardData: CardData[]) => void;
  onOpen: (cardData: CardData) => void;
}

export function ReportViewer(props: ReportViewerProps) {
  const { report } = props;

  const [isBodyExpanded, setIsBodyExpanded] = useState(false);

  const highlightedId = report.isHighlighted ? report.entityId : report.children.find((child) => child.isHighlighted)?.entityId ?? null;

  // Auto expand highlighted child entity
  useEffect(() => {
    handleExpand(highlightedId ?? "", true);
  }, [highlightedId]);

  const handleExpand = (id: string, scrollTo?: boolean) => {
    const accordion = document.querySelector<HTMLElement>(`[data-entity-id="${id}"]`);
    accordion?.setAttribute("data-open", "true");
    if (scrollTo) {
      accordion?.querySelector(".js-accordion-scroll-center")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleCollapse = (id: string) => {
    const accordion = document.querySelector<HTMLElement>(`[data-entity-id="${id}"]`);
    accordion?.removeAttribute("data-open");
  };

  const handleOpenCard = (entityId: string, entityType: number, title: string) => {
    const cardData = entityToCard(entityId, entityType, title);
    props.onOpen(cardData);
  };

  const handleDragEnd = (entityId: string, entityType: number, title: string, e: DragEvent) => {
    if (isFigmaWebDragEnd(e)) {
      const cardData = entityToCard(entityId, entityType, title);
      props.onAddMultiple([cardData]);
    }
  };

  return (
    <>
      <article class={`${props.className ?? ""} c-card-article`}>
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
          <a
            class="u-reset"
            target="_blank"
            href={getEntityUrl(report.entityType, report.entityId)}
            onDragEnd={(e) => handleDragEnd(report.entityId, report.entityType, report.title, e)}
            onClick={() => handleOpenCard(report.entityId, report.entityType, report.title)}
          >
            {report.title}
          </a>
        </h1>
        <div class="c-action-bar">
          <button
            title="Add report to Figma"
            class="u-reset c-action-bar__button"
            onClick={() => props.onAddMultiple([entityToCard(report.entityId, report.entityType, report.title)])}
          >
            Add
          </button>
          <button
            title="Add report and its insights and recommendations to Figma"
            class="u-reset c-action-bar__button"
            onClick={() =>
              props.onAddMultiple([
                entityToCard(report.entityId, report.entityType, report.title),
                ...report.children.map((child) => entityToCard(child.entityId, child.entityType, child.title)),
              ])
            }
          >
            Add all
          </button>
        </div>
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
        <p class="c-card-body">
          <span class="c-card-body__visible" data-overflow={!isBodyExpanded && !!report.bodyOverflow}>
            {report.body}
            {!isBodyExpanded && report.bodyOverflow && (
              <>
                ...{" "}
                <button class="u-reset c-accordion-inline-button" onClick={() => setIsBodyExpanded((prev) => !prev)}>
                  Show more
                </button>
              </>
            )}
          </span>
          {isBodyExpanded && report.bodyOverflow && <span> {report.bodyOverflow}</span>}
          {report.bodyOverflow && isBodyExpanded && (
            <>
              {" "}
              <button class="u-reset c-accordion-inline-button" onClick={() => setIsBodyExpanded((prev) => !prev)}>
                Show less
              </button>
            </>
          )}
        </p>
        <ul class="c-child-entity-list">
          {report.children.map((child) => (
            <li key={child.entityId}>
              <div class="c-child-accordion__container" data-entity-id={child.entityId} data-has-details={child.body.length > 0}>
                <div class="c-child-accordion__title">
                  {EntityIconComponent[child.entityType]()}
                  <span class="js-accordion-scroll-center c-child-title" data-highlight={child.isHighlighted}>
                    <a
                      class="u-reset"
                      target="_blank"
                      href={getEntityUrl(child.entityType, child.entityId)}
                      onClick={() => handleOpenCard(child.entityId, child.entityType, child.title)}
                      onDragEnd={(e) => handleDragEnd(child.entityId, child.entityType, child.title, e)}
                    >
                      {child.title}
                    </a>
                  </span>
                </div>

                <div class="c-action-bar c-action-bar--indented">
                  <button
                    class="u-reset c-action-bar__button"
                    title="Add to Figma"
                    onClick={() => props.onAddMultiple([entityToCard(child.entityId, child.entityType, child.title)])}
                  >
                    Add
                  </button>
                  {child.body.length ? (
                    <button class="u-reset c-action-bar__button c-child-accordion__collapsed-only" onClick={() => handleExpand(child.entityId)}>
                      Show content
                    </button>
                  ) : null}
                  {child.body.length ? (
                    <button class="u-reset c-action-bar__button c-child-accordion__expanded-only" onClick={() => handleCollapse(child.entityId)}>
                      Hide content
                    </button>
                  ) : null}
                </div>

                {child.body.length ? <p class="c-child-details c-child-accordion__expanded-only">{child.body}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}
