const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const AAD_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(
  ["/devicecode", "/token"],
  createProxyMiddleware({
    logLevel: "debug",
    target: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0`,
    changeOrigin: true,
  })
);
app.use("/graphql", createProxyMiddleware({ logLevel: "debug", target: "https://hits.microsoft.com/api", changeOrigin: true }));

app.listen(port);
console.log(`[proxy] Listening at port ${port}`);
