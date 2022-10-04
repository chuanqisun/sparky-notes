import { useCallback, useEffect, useState } from "preact/hooks";
import type { Authenticatable, Configurable, Displayable, LinkSourceable, LinkTargetable, PluginBase, Searchable, Syncable } from "../../modules/kernel/kernel";
import { useLocalStorage } from "../../utils/use-local-storage";
import { PluginId } from "../plugin-ids";
import { embeddedSignIn, getAccessToken, signOutRemote } from "./auth";
import type { FilterConfig } from "./hits";
import iconUrl from "./hits.svg";
import { searchHits } from "./proxy";
import { getClaimsFromSearchResultItemsV2 } from "./search";

export interface HitsGraphNode {
  title: string;
  details: string;
  id: string;
  entityType: number;
  updatedOn: string;
  targets: {
    id: string;
    entityType: number;
    relation: string;
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

export function useHits(): PluginBase &
  Searchable<HitsGraphNode> &
  Displayable<HitsGraphNode> &
  Syncable<HitsGraphNode> &
  Configurable<HitsConfig> &
  LinkSourceable<HitsGraphNode> &
  LinkTargetable &
  Authenticatable {
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
    console.log(searchSummary);

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
      keywords: `hits: ${entityNames[data.entityType]} ${data.title}`,
    }),
    []
  );

  const toDisplayItem = useCallback(
    (data: HitsGraphNode) => ({
      iconUrl,
      title: `hits: ${entityNames[data.entityType]} ${data.title}`,
    }),
    []
  );

  const toLinkSource = useCallback(
    (node: HitsGraphNode) => ({
      targets: node.targets.map((target) => ({
        url: `https://hits.microsoft.com/${entityNames[target.entityType]}/${target.id}`,
        relation: target.relation,
      })),
    }),
    []
  );

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
    toLinkSource,
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
        researcherDirectoryObjectIds: ["d9d18774-66e4-40c1-8353-a7ea2fd6bc82"],
      },
    ],
  };
}
