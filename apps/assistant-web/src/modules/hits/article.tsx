import type { CardData } from "@h20/types";
import type { HitsDisplayNode } from "../display/display-node";
import "./article.css";
import { EntityBackgroundColor, EntityDisplayName, EntityIconComponent, EntityName } from "./entity";

export interface HitsCardProps {
  node: HitsDisplayNode;
  isParent?: boolean;
  onClick: (cardData: CardData) => void;
}
export function HitsArticle({ node, onClick, isParent }: HitsCardProps) {
  return (
    <>
      <li class={`c-list__item`} key={node.id}>
        <button
          class={`u-reset c-button--hits ${isParent ? "c-button--hits-parent" : "c-button--hits-child"}`}
          onClick={(e) =>
            e.ctrlKey
              ? window.open(`https://hits.microsoft.com/${EntityName[node.entityType]}/${node.id}`, "__blank")
              : onClick({
                  category: EntityDisplayName[node.entityType],
                  title: node.title,
                  entityId: node.id,
                  entityType: node.entityType,
                  backgroundColor: EntityBackgroundColor[node.entityType],
                  url: `https://hits.microsoft.com/${EntityName[node.entityType]}/${node.id}`,
                })
          }
        >
          <article class="hits-item">
            {EntityIconComponent[node.entityType]()}
            <div class="hits-item__text">
              <span class={`hits-item__title ${isParent ? "hits-item__title--parent" : ""}`} dangerouslySetInnerHTML={{ __html: node.titleHtml }} />{" "}
              {isParent && (
                <>
                  {node.researchers && <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: node.researchersHtml }} />}
                  &nbsp;· <span class="hits-item__meta-field">{node.updatedOn.toLocaleDateString()}</span>
                </>
              )}
            </div>
          </article>
        </button>
      </li>
      {isParent &&
        node.children.map((childNode) =>
          childNode.hasHighlight ? <HitsArticle isParent={false} node={childNode as any as HitsDisplayNode} onClick={onClick} /> : null
        )}
    </>
  );
}
