import { useCallback, useEffect, useState } from "preact/hooks";
import { useLocalStorage } from "../../utils/use-local-storage";
import { PluginId } from "../plugin-ids";
import documentIconUrl from "./assets/document.svg";
import lightbulbIconUrl from "./assets/lightbulb.svg";
import thumbupIconUrl from "./assets/thumbup.svg";
import { embeddedSignIn, getAccessToken, signOutRemote } from "./auth";
import type { FilterConfig } from "./hits";
import iconUrl from "./hits.svg";
import { searchHits } from "./proxy";
import { getClaimsFromSearchResultItemsV2 } from "./search";
import "./styles.css";

export interface HitsGraphNode {
  title: string;
  details: string;
  id: string;
  entityType: number;
  updatedOn: string;
  parent?: {
    title: string;
    id: number;
  };
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

    const addItems = claims.map((claim) => ({
      id: `hits_${claim.id}`,
      data: claim,
      pluginId: PluginId.Hits,
      dateUpdated: new Date(claim.updatedOn),
    }));

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

  const toDisplayItem = useCallback((data: HitsGraphNode, query: string) => {
    const tokens = query
      .split(" ")
      .map((item) => item.trim())
      .filter(Boolean);
    const tokensPattern = tokens.length ? new RegExp(String.raw`\b(${tokens.join("|")})`, "gi") : null;
    const getHighlightedHtml = (input: string) => (tokensPattern ? input.replace(tokensPattern, (match) => `<mark>${match}</mark>`) : input);

    const isParent = !data.parent;

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

  const getIdFromUrl = useCallback((url: URL) => {
    if (!url.href.includes("https://hits.microsoft.com")) return null;

    const id = url.href.toLocaleLowerCase().replace("https://hits.microsoft.com/insight/", "").replace("https://hits.microsoft.com/recommendation/", "");
    id.replace("/", "");

    return `hits_${id}`;
  }, []);

  return {
    id: PluginId.Hits,
    displayName: "HITS",
    isConnected,
    config: hitsConfig.value,
    getIdFromUrl,
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
        // researcherDirectoryObjectIds: ["d9d18774-66e4-40c1-8353-a7ea2fd6bc82"],
      },
    ],
  };
}
