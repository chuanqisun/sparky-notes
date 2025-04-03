import { useCallback, useEffect, useState } from "preact/hooks";
import type { WorkerEvents, WorkerRoutes } from "../../routes";
import { flatItem } from "../../utils/array";
import type { WorkerClient } from "../../utils/worker-rpc";
import { isClaimType } from "../display/display-node";
import { getHubSlug } from "./get-hub-slug";
import type { SearchResultTag } from "./hits";

export interface UseReportDetailsProps {
  worker: WorkerClient<WorkerRoutes, WorkerEvents>;
  accessToken: string;
  isTokenExpired: boolean;
  entityId?: string;
  entityType?: number;
}

export interface ReportDetails {
  entityId: string;
  entityType: number;
  title: string;
  body: string;
  /** Only when body is truncated */
  bodyOverflow: string;
  isHighlighted: boolean;
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
    isHighlighted: boolean;
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

const bodyTextOverflowThreshold = 100;

export function useReportDetails({ isTokenExpired, accessToken, entityId, entityType, worker }: UseReportDetailsProps) {
  const [report, setReport] = useState<ReportDetails | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const normalizeWhitespace = useCallback((text: string) => text.trim().replace(/\s+/g, " "), []);

  useEffect(() => {
    setIsLoading(true);

    // We skip data fetching until token has valid expiry.
    // Note it is still possible for client to believe token is valid while the server has revoked it.
    // The background token request will hopefully fetch a valid token for the next round
    // In that case, we will set the data to null and give user a link to reload the page
    if (isTokenExpired) return;

    if (!entityId || !entityType) return;

    worker.request("getCardData", { accessToken, entityId, entityType }).then((result) => {
      const { cardData } = result;
      if (!cardData) {
        setReport(null);
        return;
      }

      const outline = JSON.parse(cardData.outline);
      console.log(outline);
      const flatIds = flatItem(outline)
        .filter(isClaimType)
        .filter((item) => Boolean(item.id))
        .map((item) => item.id.toString());

      const normalizedBodyWords = normalizeWhitespace(cardData.contents ?? "").split(" ");

      setIsLoading(false);

      setReport({
        entityId: cardData.id,
        title: normalizeWhitespace(cardData.title),
        body: cardData.abstract ?? normalizedBodyWords.slice(0, bodyTextOverflowThreshold).join(" "),
        bodyOverflow: cardData.abstract ? "" : normalizedBodyWords.slice(bodyTextOverflowThreshold).join(" "),
        isHighlighted: entityId === cardData.id,
        entityType: cardData.entityType,
        updatedOn: new Date(cardData.updatedOn),
        group: {
          displayName: cardData.group.name,
          url: `https://hits.microsoft.com/group/${getHubSlug(cardData.group.name)}`,
        },
        researchers: cardData.researchers.map((researcher) => ({
          displayName: researcher.name,
          url: `https://hits.microsoft.com/researcher/${researcher.alias}`,
        })),
        children: cardData.children
          .filter(isClaimType)
          .sort((a, b) => flatIds.indexOf(a.id) - flatIds.indexOf(b.id))
          .map((child) => ({
            entityId: child.id,
            entityType: child.entityType,
            isHighlighted: entityId === child.id,
            title: normalizeWhitespace(child.title ?? "Untitled"),
            body: normalizeWhitespace(child.contents ?? ""),
          })),
        tags: [...cardData.products.map(getDisplayTagMapper("product")), ...cardData.topics.map(getDisplayTagMapper("topic"))],
      });
    });
  }, [isTokenExpired, entityId, entityType]);

  return {
    report,
    isLoading,
  };
}

function getDisplayTagMapper(typePrefix: string) {
  return (searchTag: SearchResultTag) => ({
    displayName: searchTag.name,
    url: `https://hits.microsoft.com/${typePrefix}/${getHubSlug(searchTag.name)}`,
  });
}
