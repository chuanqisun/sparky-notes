import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "data-loader/src/serve";
import type React from "react";

const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "http://localhost:5700",
    }),
  ],
});

export const Shelf: React.FC = () => {
  // idea
  // Search claims to add to shelf
  // Node operation:
  // - User can use a lens to identify point of interests from all the claims on the shelf
  // Edge operation:
  // -  GPT will suggest links between claims
  // Graph operation:
  // - GPT will identify themes and patterns across items

  return <div>TBD</div>;
};

export default Shelf;
