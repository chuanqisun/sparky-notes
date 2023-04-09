import { createProxyMiddleware } from "http-proxy-middleware";

export const hitsUATSearch = (path: string) =>
  createProxyMiddleware({
    logLevel: "debug",
    target: process.env.HITS_UAT_SEARCH_ENDPOINT,
    changeOrigin: true,
    pathRewrite: { "^/hits/search/claims": path },
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.HITS_UAT_SEARCH_API_KEY ?? "",
    },
  });
