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
    const response = await ctx.cozoDb.run(
      `
      selectedClaim[id] <- $claimIds
      matchTriple[claimId, otherClaimId] := 
        claimId < otherClaimId,
        selectedClaim[claimId], # needle
          *claimTriple[claimId, s, p, o],
        *claim{claimId: otherClaimId}, # haystack
          *claimTriple[otherClaimId, s, x, o] or
          *claimTriple[otherClaimId, o, x, s] or
          *claimTriple[otherClaimId, x, p, o] or
          *claimTriple[otherClaimId, o, p, x] or
          *claimTriple[otherClaimId, x, p, s] or
          *claimTriple[otherClaimId, s, p, x]

      ?[claimId, otherClaimId] := matchTriple[claimId, otherClaimId]
    `,
      { claimIds: input.claimIds.map((id) => [id]) }
    );
    return response.rows.map((row: any) => ({
      claimId: row[0] as string,
      otherClaimId: row[1] as string,
      s: row[2] as string,
      p: row[3] as string,
      o: row[4] as string,
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
