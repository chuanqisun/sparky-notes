import type { CardData } from "@h20/assistant-types";
import type { HitsDisplayNode } from "../display/display-node";
import "./article.css";
import { EntityIconComponent } from "./entity";
import { entityToCard } from "./entity-to-card";
import { getEntityUrl } from "./get-entity-url";

export interface HitsCardProps {
  node: HitsDisplayNode;
  isParent?: boolean;
  onSelect: (cardData: CardData) => void;
  onOpen: (cardData: CardData) => void;
  visitedIds: Set<string>;
}
export function HitsArticle({ node, onSelect, onOpen, isParent, visitedIds }: HitsCardProps) {
  const cardData = entityToCard(node.id, node.entityType, node.title);

  const handleClickInternal = (e: MouseEvent) => {
    if (!e.ctrlKey) {
      onSelect(cardData);
      e.preventDefault();
    } else {
      onOpen(cardData);
    }
  };

  return (
    <>
      <li class={`c-list__item c-list__item--article`} key={node.id} draggable={true}>
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
            <HitsArticle isParent={false} node={childNode as any as HitsDisplayNode} onSelect={onSelect} onOpen={onOpen} visitedIds={visitedIds} />
          ) : null
        )}
    </>
  );
}
