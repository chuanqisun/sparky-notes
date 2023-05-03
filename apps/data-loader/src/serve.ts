import { initTRPC } from "@trpc/server";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import path from "path";
import { initGraphDb } from "./lib/hits/graph";

const t = initTRPC.create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

const cozoDbAsync = initGraphDb(path.resolve("./data/graph-db"));

const appRouter = router({
  relations: publicProcedure.query(async () => {
    // Retrieve users from a datasource, this is an imaginary database
    const users = (await cozoDbAsync).run(`::relations`);
    //    ^?
    return users as any;
  }),
  getEntities: publicProcedure
    .input((v) => v)
    .query(async (opts) => {
      return "";
    }),
  userCreate: publicProcedure
    .input((v) => v)
    .mutation(async (opts) => {
      return "";
    }),
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;

const server = createHTTPServer({
  router: appRouter,
});

server.listen(3000);
