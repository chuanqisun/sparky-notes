import cors from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const port = process.env.PORT || 5202;
const app = express();

app.use(cors());
app.use("/api", createProxyMiddleware({ logLevel: "debug", target: "https://hits.microsoft.com", changeOrigin: true }));

app.listen(port);
console.log(`[proxy] Listening at port ${port}`);
