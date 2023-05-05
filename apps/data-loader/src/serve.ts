import { initTRPC, type inferAsyncReturnType } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import path from "path";
import { initGraphDb } from "./lib/hits/graph";

import cors from "cors";
import { SEARCH_CLAIMS } from "./lib/hits/cozo-scripts/cozo-scripts";

const t = initTRPC.context<Context>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
const cozoDbAsync = initGraphDb(path.resolve("./data/graph-db"));

export type Context = inferAsyncReturnType<typeof createContext>;
export const createContext = async () => {
  return {
    cozoDb: await cozoDbAsync,
  };
};

export function dummyValidator<T>(v: any) {
  return v as T;
}

const appRouter = router({
  searchClaims: publicProcedure.input(dummyValidator<{ q: string }>).query(async ({ input, ctx }) => {
    const response = await ctx.cozoDb.run(SEARCH_CLAIMS, { q: input.q });
    return response.rows.map((row: any) => ({
      claimId: row[2] as string,
      claimTitle: row[1] as string,
    })) as { claimId: string; claimTitle: string }[];
  }),
  exploreClaims: publicProcedure.input(dummyValidator<{ claimIds: string[] }>).query(async ({ input, ctx }) => {
    performance.mark("start");

    const response = await ctx.cozoDb.run(
      `

      spo_spo[fromId, toId, score] := *claimTriple[fromId, s, p, o], *claimTriple[toId, s, p, o], fromId < toId, score = 5
      spo_ops[fromId, toId, score] := *claimTriple[fromId, s, p, o], *claimTriple[toId, o, p, s], fromId < toId, score = 5

      sxo_syo[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, x, o], *claimTriple[toId, s, y, o], fromId < toId, score = 3
      sxo_oys[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, x, o], *claimTriple[toId, o, y, s], fromId < toId, score = 3

      spx_spy[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, p, x], *claimTriple[toId, s, p, y], fromId < toId, score = 2
      spx_yps[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, p, x], *claimTriple[toId, y, p, s], fromId < toId, score = 2

      selectedClaim[id] <- $claimIds
      edge[fromId, toId, sum(x)] := 
        selectedClaim[fromId],
        spo_spo[fromId, toId, x] or
        spo_ops[fromId, toId, x] or
        spx_spy[fromId, toId, x] or
        spx_yps[fromId, toId, x] or
        sxo_syo[fromId, toId, x] or
        sxo_oys[fromId, toId, x] 

      ?[fromId, toId, x] := edge[fromId, toId, x]

      :sort -x

      :limit 10

    `,
      { claimIds: input.claimIds.map((id) => [id]) }
    );
    console.log(`${performance.measure("t", "start").duration.toFixed(2)} ms | ${response.rows.length} rows`);
    return response.rows.map((row: any) => ({
      claimId: row[0] as string,
      otherClaimId: row[1] as string,
      score: row[2] as number,
    })) as { claimId: string; claimTitle: string; s: string; p: string; o: string }[];
  }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  middleware: cors(),
  createContext,
  router: appRouter,
});

server.listen(5700);
