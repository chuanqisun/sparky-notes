import type { CardData } from "@h20/assistant-types";
import { useRef } from "preact/hooks";
import type { HitsDisplayNode } from "../display/display-node";
import "./article.css";
import { EntityIconComponent, EntityName } from "./entity";
import { entityToCard } from "./entity-to-card";

export interface HitsCardProps {
  node: HitsDisplayNode;
  isParent?: boolean;
  onClick: (cardData: CardData) => void;
  onDragStart: (cardData: CardData, e: DragEvent) => void;
}
export function HitsArticle({ node, onClick, onDragStart, isParent }: HitsCardProps) {
  const cardData = entityToCard(node.id, node.entityType, node.title);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClickInternal = (e: MouseEvent) => {
    buttonRef.current?.classList.add("c-button--hits-clicked");
    e.ctrlKey ? window.open(`https://hits.microsoft.com/${EntityName[node.entityType]}/${node.id}`, "__blank") : onClick(cardData);
  };

  const handleDragInternal = (e: DragEvent) => {
    buttonRef.current?.classList.add("c-button--hits-clicked");
    onDragStart(cardData, e);
  };

  return (
    <>
      <li class={`c-list__item`} key={node.id} draggable={true} onDragStart={handleDragInternal}>
        <button ref={buttonRef} class={`u-reset c-button--hits ${isParent ? "c-button--hits-parent" : "c-button--hits-child"}`} onClick={handleClickInternal}>
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
        </button>
      </li>
      {isParent &&
        node.children.map((childNode) =>
          node.showAllChildren || childNode.hasHighlight ? (
            <HitsArticle isParent={false} node={childNode as any as HitsDisplayNode} onClick={onClick} onDragStart={onDragStart} />
          ) : null
        )}
    </>
  );
}
