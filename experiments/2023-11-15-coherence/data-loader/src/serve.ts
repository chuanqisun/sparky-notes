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
  scanClaim: publicProcedure.input(dummyValidator<{ claimIds: string[] }>).query(async ({ input, ctx }) => {
    performance.mark("start");

    console.log(input.claimIds);
    const response = await ctx.cozoDb.run(
      `
      ##################
      # common relations
      ##################
      selectedClaim[fromId] <- $claimIds
      
      ####################
      # Ontology relations
      ####################
      spo_spo[fromId, toId, score] := *claimTriple[fromId, s, p, o], *claimTriple[toId, s, p, o], fromId < toId, score = 5
      spo_ops[fromId, toId, score] := *claimTriple[fromId, s, p, o], *claimTriple[toId, o, p, s], fromId < toId, score = 5

      sxo_syo[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, x, o], *claimTriple[toId, s, y, o], fromId < toId, score = 3
      sxo_oys[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, x, o], *claimTriple[toId, o, y, s], fromId < toId, score = 3

      spx_spy[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, p, x], *claimTriple[toId, s, p, y], fromId < toId, score = 2
      spx_yps[fromId, toId, score] := not spo_spo[fromId, toId, _], not spo_ops[fromId, toId, _], *claimTriple[fromId, s, p, x], *claimTriple[toId, y, p, s], fromId < toId, score = 2

      ontoEdge[fromId, toId, sum(x)] := 
        selectedClaim[fromId],
        spo_spo[fromId, toId, x] or
        spo_ops[fromId, toId, x] or
        spx_spy[fromId, toId, x] or
        spx_yps[fromId, toId, x] or
        sxo_syo[fromId, toId, x] or
        sxo_oys[fromId, toId, x] 
        
      ontologyMatch[fromId, fromTitle, toId, toTitle, score, type] := 
        ontoEdge[fromId, toId, score],
        *claim{claimId: fromId, claimTitle: fromTitle},
        *claim{claimId: toId, claimTitle: toTitle},
        type = 'onto'

      ######################
      # similarity relations
      ######################
      selectedOntology[from_s, from_p, from_o] := *claimTriple[fromId, from_s, from_p, from_o], selectedClaim[fromId]
      selectedEntity[fromId, e] := *claimTriple[fromId, e, p1, o1] or *claimTriple[fromId, s2, e, o2] or *claimTriple[fromId, s3, p3, e], selectedClaim[fromId]
      similarEntity[fromId, sim_e] := selectedEntity[fromId, e], *entity:semantic{layer: 0, fr_text: e, to_text: sim_e, dist}, dist < 0.15 

      fullySimilarClaim[fromId, toId, score] := 
        fromId != toId,
        e1 < e3, 
        similarEntity[fromId, e1], similarEntity[fromId, e2], similarEntity[fromId, e3],
        *claimTriple[toId, e1, e2, e3],
        score = 5

      partialSimilarClaim[fromId, toId, score] := 
        not fullySimilarClaim[fromId, toId, _],
        fromId != toId,
        e1 != e2,
        similarEntity[fromId, e1], similarEntity[fromId, e2],
        *claimTriple[toId, e1, p, e2] or
        *claimTriple[toId, e1, e2, o] or
        *claimTriple[toId, s, e1, e2],
        score = 3

      edge[fromId, toId, sum(score)] := partialSimilarClaim[fromId, toId, score] or fullySimilarClaim[fromId, toId, score]

      similarityMatch[fromId, fromTitle, toId, toTitle, score, type] := 
        edge[fromId, toId, score],
        *claim{claimId: fromId, claimTitle: fromTitle},
        *claim{claimId: toId, claimTitle: toTitle},
        type='sim'

      ?[fromId, fromTitle, toId, toTitle, max(score), collect(type)] :=
        similarityMatch[fromId, fromTitle, toId, toTitle, score, type] or
        ontologyMatch[fromId, fromTitle, toId, toTitle, score, type]

    `,
      { claimIds: input.claimIds.map((id) => [id]) }
    );

    console.log(`${performance.measure("t", "start").duration.toFixed(2)} ms | ${response.rows.length} rows`);

    return response.rows.map((row: any) => ({
      fromId: row[0] as string,
      fromTitle: row[1] as string,
      toId: row[2] as string,
      toTitle: row[3] as string,
      score: row[4] as number,
      type: row[5] as ("onto" | "sim")[],
    })) as { fromId: string; fromTitle: string; toId: string; toTitle: string; score: number; type: ("onto" | "sim")[] }[];
  }),
  exploreSemantics: publicProcedure.input(dummyValidator<{ claimIds: string[] }>).query(async ({ input, ctx }) => {
    performance.mark("start");

    console.log(input.claimIds);
    const response = await ctx.cozoDb.run(
      `
      selectedClaim[fromId] <- $claimIds
      selectedOntology[from_s, from_p, from_o] := *claimTriple[fromId, from_s, from_p, from_o], selectedClaim[fromId]
      selectedEntity[fromId, e] := *claimTriple[fromId, e, p1, o1] or *claimTriple[fromId, s2, e, o2] or *claimTriple[fromId, s3, p3, e], selectedClaim[fromId]
      similarEntity[fromId, sim_e] := selectedEntity[fromId, e], *entity:semantic{layer: 0, fr_text: e, to_text: sim_e, dist}, dist < 0.15 

      fullySimilarClaim[fromId, toId, score] := 
        fromId != toId,
        e1 < e3, 
        similarEntity[fromId, e1], similarEntity[fromId, e2], similarEntity[fromId, e3],
        *claimTriple[toId, e1, e2, e3],
        score = 5

      partialSimilarClaim[fromId, toId, score] := 
        not fullySimilarClaim[fromId, toId, _],
        fromId != toId,
        e1 != e2,
        similarEntity[fromId, e1], similarEntity[fromId, e2],
        *claimTriple[toId, e1, p, e2] or
        *claimTriple[toId, e1, e2, o] or
        *claimTriple[toId, s, e1, e2],
        score = 3

      edge[fromId, toId, sum(score)] := partialSimilarClaim[fromId, toId, score] or fullySimilarClaim[fromId, toId, score]

      ?[fromId, fromTitle, toId, toTitle, score] := 
        edge[fromId, toId, score],
        *claim{claimId: fromId, claimTitle: fromTitle},
        *claim{claimId: toId, claimTitle: toTitle}

    `,
      { claimIds: input.claimIds.map((id) => [id]) }
    );

    console.log(`${performance.measure("t", "start").duration.toFixed(2)} ms | ${response.rows.length} rows`);

    return response.rows.map((row: any) => ({
      fromId: row[0] as string,
      fromTitle: row[1] as string,
      toId: row[2] as string,
      toTitle: row[3] as string,
      score: row[4] as number,
    })) as { fromId: string; fromTitle: string; toId: string; toTitle: string; score: number }[];
  }),
  induceClaims: publicProcedure.input(dummyValidator<{ claimIds: string[] }>).query(async ({ input, ctx }) => {
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
        
      ?[fromId, fromTitle, toId, toTitle, score] := 
        edge[fromId, toId, score],
        *claim{claimId: fromId, claimTitle: fromTitle},
        *claim{claimId: toId, claimTitle: toTitle}

      :sort -score
      :limit 10
    `,
      { claimIds: input.claimIds.map((id) => [id]) }
    );
    console.log(`${performance.measure("t", "start").duration.toFixed(2)} ms | ${response.rows.length} rows`);
    return response.rows.map((row: any) => ({
      fromId: row[0] as string,
      fromTitle: row[1] as string,
      toId: row[2] as string,
      toTitle: row[3] as string,
      score: row[4] as number,
    })) as { fromId: string; fromTitle: string; toId: string; toTitle: string; score: number }[];
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
