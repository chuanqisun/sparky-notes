import type { CardData } from "@h20/assistant-types";
import { useCallback } from "preact/hooks";
import type { HitsDisplayNode } from "../display/display-node";
import { EntityIconComponent } from "./entity";
import { entityToCard } from "./entity-to-card";
import { getEntityUrl } from "./get-entity-url";

export interface HitsCardProps {
  node: HitsDisplayNode;
  isParent?: boolean;
  onAdd: (cardData: CardData) => void;
  onSelect: (cardData: CardData) => void;
  onOpen: (cardData: CardData) => void;
  visitedIds: Set<string>;
}
export function HitsArticle({ node, onSelect, onOpen, onAdd, isParent, visitedIds }: HitsCardProps) {
  const cardData = entityToCard(node.id, node.entityType, node.title);

  const handleClickInternal = useCallback(
    (e: MouseEvent) => {
      if (!e.ctrlKey) {
        onSelect(cardData);
        e.preventDefault();
      } else {
        onOpen(cardData);
      }
    },
    [onSelect, onOpen]
  );

  const handleDragEnd = useCallback(
    (e: DragEvent) => {
      console.log("debug drag end", e);
      // TODO: make sure the drop target meets all following criteria:
      // 1. It must accept copy effect. (check: event.dataTransfer.dropEffect === "copy")
      // 2. It must be outside of plugin iframe. (It's INSIDE when 0 < event.clientX < window.innerWidth, 0 < event.clientY < window.innerHeight)
      // 3. It must be inside of Figma app window. (window.screenTop < event.screenY < window.screenTop + window.outerHeight, window.screenLeft < event.screenX < window.screenLeft + window.outerWidth)
      // 4. (Impossible to check?) It must be inside of Figma canvas area
      // 5. It must NOT be the native app. (check: agent.navigator)
      // ref: https://www.figma.com/plugin-docs/creating-ui/#drop-events-from-a-non-null-origin-iframe
      // ref: https://forum.figma.com/t/inconsistent-plugin-behavior-in-figma-app-and-browser/38439/2
      onAdd(cardData);
    },
    [onAdd]
  );

  return (
    <>
      <li class={`c-list__item c-list__item--article`} key={node.id} draggable={true} onDragEnd={handleDragEnd}>
        <a
          href={getEntityUrl(node.entityType, node.id)}
          title="Drag to canvas or click to open"
          target="_blank"
          class={`u-reset c-button--hits ${isParent ? "c-button--hits-parent" : "c-button--hits-child"}`}
          data-visited={visitedIds.has(node.id)}
          onClick={handleClickInternal}
        >
          <article class="hits-item">
            {EntityIconComponent[node.entityType]()}
            <div class="hits-item__text">
              <span class={`hits-item__title ${isParent ? "hits-item__title--parent" : ""}`} dangerouslySetInnerHTML={{ __html: node.titleHtml }} />{" "}
              {isParent ? (
                <>
                  {node.researchers && <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: node.researchersHtml }} />}
                  &nbsp;· <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: node.idHtml }} />
                  &nbsp;· <span class="hits-item__meta-field">{node.updatedOn.toLocaleDateString()}</span>
                </>
              ) : !isParent && node.id !== node.idHtml ? (
                <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: node.idHtml }} />
              ) : null}
            </div>
          </article>
        </a>
      </li>
      {isParent &&
        node.children.map((childNode) =>
          node.showAllChildren || childNode.hasHighlight ? (
            <HitsArticle
              isParent={false}
              node={childNode as any as HitsDisplayNode}
              onSelect={onSelect}
              onOpen={onOpen}
              onAdd={onAdd}
              visitedIds={visitedIds}
            />
          ) : null
        )}
    </>
  );
}
