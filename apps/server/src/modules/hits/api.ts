import { createProxyMiddleware } from "http-proxy-middleware";

export const hitsApi = createProxyMiddleware({
  logLevel: "debug",
  target: "https://hits.microsoft.com",
  changeOrigin: true,
  pathRewrite: { "^/hits/api": "/api" },
});
