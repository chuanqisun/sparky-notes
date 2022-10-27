import { useCallback, useEffect, useState } from "preact/hooks";
import type { NodeSchema } from "../../modules/graph/db";
import { useLocalStorage } from "../../utils/use-local-storage";
import documentIconUrl from "./assets/document.svg";
import lightbulbIconUrl from "./assets/lightbulb.svg";
import thumbupIconUrl from "./assets/thumbup.svg";
import { embeddedSignIn, getAccessToken, signOutRemote } from "./auth";
import type { FilterConfig } from "./hits";
import iconUrl from "./hits.svg";
import { searchHits } from "./proxy";
import { getClaimsFromSearchResultItemsV2 } from "./search";
import "./styles.css";

export interface HitsGraphNode extends NodeSchema {
  id: string;
  updatedOn: Date;
  parentId?: string;
  title: string;
  entityType: number;
  group?: {
    id: number;
    displayName: string;
  };
  researchers?: {
    id: number;
    displayName: string;
  }[];
  tags?: {
    id: number;
    displayName: string;
  }[];
}

export interface HitsConfig {
  email: string;
  idToken: string;
  userClientId: string;
  queries: FilterConfig[];
}

const entityNames: Record<number, string> = {
  1: "insight",
  2: "study",
  32: "collection",
  64: "note",
  25: "recommendation",
};

const entityIcons: Record<number, string> = {
  1: lightbulbIconUrl,
  2: documentIconUrl,
  25: thumbupIconUrl,
  32: documentIconUrl,
  64: documentIconUrl,
};

export function useHits() {
  const [isConnected, setIsConnected] = useState<boolean | undefined>(undefined);

  const hitsConfig = useLocalStorage({
    namespace: "hits-config",
    getInitialValue: getBlankConfig,
  });

  useEffect(() => {
    if (!hitsConfig.value.email || !hitsConfig.value.idToken) return;

    getAccessToken({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId })
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, [hitsConfig.value.idToken]);

  const pull = useCallback(async () => {
    const token = await getAccessToken({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId });
    const searchSummary = await searchHits(token, hitsConfig.value.queries[0]);
    const claims = getClaimsFromSearchResultItemsV2(searchSummary.results);

    // TODO differential pull
    const addItems = claims;

    return {
      add: addItems,
      remove: [],
      update: [],
    };
  }, [hitsConfig.value]);

  const signIn = useCallback(() => {
    embeddedSignIn().then((result) => {
      hitsConfig.update({ ...hitsConfig.value, email: result.email, idToken: result.id_token, userClientId: result.userClientId });
    });
  }, []);

  const signOut = useCallback(() => {
    signOutRemote({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId }).then(() => {
      hitsConfig.update(getBlankConfig());
    });
  }, [hitsConfig.value]);

  const toSearchItem = useCallback(
    (data: HitsGraphNode) => ({
      keywords: `${entityNames[data.entityType]}; ${data.title}; ${data.group?.displayName ?? ""}; ${
        data.researchers?.map((person) => person.displayName).join(", ") ?? ""
      }; ${data.tags?.map((tag) => tag.displayName).join(", ") ?? ""}; ${new Date(data.updatedOn).toLocaleDateString()}`,
    }),
    []
  );

  // toDisplayItem = (data: GraphNode, addHighlight: (text: string) => string, addFigma: (card: any) => void) => JSX.Element
  const toDisplayItemV2 = (data: HitsGraphNode, addHighlight: (text: string) => string, sendToFigma: (figmaCard: any) => void) => {};

  const toDisplayItem = useCallback((data: HitsGraphNode, query: string) => {
    const tokens = query
      .split(" ")
      .map((item) => item.trim())
      .filter(Boolean);
    const tokensPattern = tokens.length ? new RegExp(String.raw`\b(${tokens.join("|")})`, "gi") : null;
    const getHighlightedHtml = (input: string) => (tokensPattern ? input.replace(tokensPattern, (match) => `<mark>${match}</mark>`) : input);

    const isParent = [2, 32, 64].includes(data.entityType);

    return {
      iconUrl,
      title: `${data.title}\n${data.researchers?.map((person) => person.displayName).join(", ") ?? ""}`,
      externalUrl: `https://hits.microsoft.com/${entityNames[data.entityType]}/${data.id}`,
      innerElement: (
        <article class={`hits-item ${isParent ? "hits-item--parent" : ""}`}>
          <img class="hits-item__icon" src={entityIcons[data.entityType]} />
          <div class="hits-item__text">
            <span
              class={`hits-item__title ${isParent ? "hits-item__title--parent" : ""}`}
              dangerouslySetInnerHTML={{ __html: getHighlightedHtml(data.title) }}
            />{" "}
            {isParent && (
              <>
                {data.researchers && (
                  <span
                    class="hits-item__meta-field"
                    dangerouslySetInnerHTML={{ __html: getHighlightedHtml(data.researchers.map((person) => person.displayName).join(", ")) }}
                  />
                )}
                &nbsp;·{" "}
                <span class="hits-item__meta-field" dangerouslySetInnerHTML={{ __html: getHighlightedHtml(new Date(data.updatedOn).toLocaleDateString()) }} />
              </>
            )}
          </div>
        </article>
      ),
    };
  }, []);

  return {
    displayName: "HITS",
    isConnected,
    config: hitsConfig.value,
    pull,
    signIn,
    signOut,
    updateConfig: hitsConfig.update,
    resetConfig: hitsConfig.reset,
    toSearchItem,
    toDisplayItem,
  };
}

export function getBlankConfig(): HitsConfig {
  return {
    email: "alias@microsoft.com",
    idToken: "examplehitsdevelopertoken",
    userClientId: "unassigned",
    queries: [
      {
        entityTypes: [2], // study only
        researcherIds: [835],
      },
    ],
  };
}
