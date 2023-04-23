import assert from "assert";
import dotenv from "dotenv";

import { mkdir, rm, writeFile } from "fs/promises";
import { getClaimCountInput, getClaimIndexProxy, getClaimsPageInput } from "./lib/hits/claim-search";
import { EntityName, EntityType } from "./lib/hits/entity";

dotenv.config();

const params = process.argv.slice(2);
console.log("Data loader started with params", params);

async function main() {
  await rm("./data/claims", { recursive: true }).catch();
  await mkdir("./data/claims", { recursive: true });
  await exportClaimByType(EntityType.Insight, "./data/claims");
  await exportClaimByType(EntityType.Recommendation, "./data/claims");
}

async function exportClaimByType(entityType: number, path: string) {
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
      // await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000));
      return claimIndexProxy(getClaimsPageInput(entityType, pageSize, skip))
        .then((response) => response.value)
        .then((claims) => {
          if (!claims?.length) throw new Error("Unexpected empty response");
          const documents = claims.map(({ ["@search.score"]: _, ...rest }) => rest);
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

main();
