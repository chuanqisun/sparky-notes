import type { TreeNodeSchema } from "../../modules/graph/use-graph";
import documentIconUrl from "./assets/document.svg";
import lightbulbIconUrl from "./assets/lightbulb.svg";
import thumbupIconUrl from "./assets/thumbup.svg";
import type { HitsGraphNode } from "./use-hits";

const entityIcons: Record<number, string> = {
  1: lightbulbIconUrl,
  2: documentIconUrl,
  25: thumbupIconUrl,
  32: documentIconUrl,
  64: documentIconUrl,
};

export interface DisplayItem {
  node: HitsGraphNode;
  isChild?: boolean;
  getHighlightHtml: (text: string) => string;
  sendToFigma: (figmaCard: any) => void;
}
export function HitsDisplayItem({ node, getHighlightHtml, sendToFigma, isChild }: DisplayItem) {
  const isParent = [2, 32, 64].includes(node.entityType);

  return (
    <>
      <li class={`c-list-item`} key={node.id}>
        <button
          class={`u-reset c-button--card c-button--hits ${isChild ? "c-button--hits-child" : "c-button--hits-parent"}`}
          onClick={() =>
            sendToFigma({
              addCard: {
                title: "TBD",
                url: "TBD",
              },
            })
          }
        >
          <article class="hits-item">
            <img class="hits-item__icon" src={entityIcons[node.entityType]} />
            <div class="hits-item__text">
              <span
                class={`hits-item__title ${isParent ? "hits-item__title--parent" : ""}`}
                dangerouslySetInnerHTML={{ __html: getHighlightHtml(node.title) }}
              />{" "}
              {isParent && (
                <>
                  {node.researchers && (
                    <span
                      class="hits-item__meta-field"
                      dangerouslySetInnerHTML={{ __html: getHighlightHtml(node.researchers.map((person) => person.displayName).join(", ")) }}
                    />
                  )}
                  &nbsp;· <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: getHighlightHtml(node.updatedOn.toLocaleDateString()) }} />
                </>
              )}
            </div>
          </article>
        </button>
      </li>
      {(node as TreeNodeSchema)?.children?.map((childNode) => (
        <HitsDisplayItem isChild={true} node={childNode as HitsGraphNode} sendToFigma={sendToFigma} getHighlightHtml={getHighlightHtml} />
      ))}
    </>
  );
}
