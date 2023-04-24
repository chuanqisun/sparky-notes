import assert from "assert";
import { writeFile } from "fs/promises";
import { EntityName, EntityType } from "./entity";
import { getClaimCountInput, getClaimIndexProxy, getClaimsPageInput } from "./search-claims";

export async function exportClaims(outputDir: string) {
  await exportClaimByType(EntityType.Insight, outputDir);
  await exportClaimByType(EntityType.Recommendation, outputDir);
}

export async function exportClaimByType(entityType: number, path: string) {
  const claimIndexProxy = getClaimIndexProxy(process.env.HITS_UAT_SEARCH_API_KEY!);
  const count = (await claimIndexProxy(getClaimCountInput(entityType)))["@odata.count"];
  assert(typeof count === "number");
  console.log(EntityName[entityType], count);

  const pageSize = 1000; // azure limit
  const pageCount = Math.ceil(count / pageSize);
  console.log(`${pageSize} items * ${pageCount} pages`);

  const progress = {
    success: 0,
    error: 0,
    total: pageCount,
  };

  const pageStartIndices = Array.from({ length: pageCount }, (_, i) => i * pageSize);
  await Promise.allSettled(
    pageStartIndices.map(async (skip) => {
      return claimIndexProxy(getClaimsPageInput(entityType, pageSize, skip))
        .then((response) => response.value)
        .then((claims) => {
          if (!claims?.length) throw new Error("Unexpected empty response");
          const documents = claims.map(({ ["@search.score"]: _, ...rest }) =>
            Object.fromEntries(Object.entries(rest).map(([key, value]) => [firstLetterToLowerCase(key), value]))
          );
          return writeFile(
            `${path}/${EntityName[entityType]}-chunk-${skip.toString().padStart(`${count}`.length, "0")}.json`,
            JSON.stringify(documents, null, 2)
          );
        })
        .then(() => progress.success++)
        .catch((e) => {
          console.error(e);
          progress.error++;
        })
        .finally(() => console.log(`${EntityName[entityType]} progress: `, JSON.stringify(progress)));
    })
  ).then(() => console.log(`${EntityName[entityType]} done`, progress));
}

function firstLetterToLowerCase(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export interface ExportedClaim {
  claimId: string;
  claimType: number;
  claimTitle: string;
  claimContent: string;
  products: string[];
  topics: string[];
  methods: string[];
  rootDocumentTitle: string;
  rootDocumentContext: string;
}
