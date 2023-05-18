import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { arxivSearch } from "./modules/arxiv/search";
import { requireJwt } from "./modules/auth/require-jwt";
import { hitsApi } from "./modules/hits/api";
import { hitsSignIn } from "./modules/hits/sign-in";
import { hitsSignInStatus } from "./modules/hits/sign-in-status";
import { hitsSignOut } from "./modules/hits/sign-out";
import { hitsToken } from "./modules/hits/token";
import { hitsUATSearch } from "./modules/hits/uat-search";
import { validateHitsToken } from "./modules/hits/validate-hits-token";
import { logError } from "./modules/logging/log-error";
import { logRoute } from "./modules/logging/log-route";
import { chat } from "./modules/openai/chat";
import { completions } from "./modules/openai/completion";
import { embedding } from "./modules/openai/embedding";
import { rateLimit } from "./modules/rate-limit/rate-limit";
import { webCrawl } from "./modules/web/crawl";
import { webSearch } from "./modules/web/search";

dotenv.config();

const port = process.env.PORT || 5201;
const app = express();

app.use(express.json());
app.use(cors());

app.post("/openai/completions", [
  rateLimit(120),
  validateHitsToken,
  completions({
    endpoint: process.env.OPENAI_COMPLETION_ENDPOINT!,
    key: process.env.OPENAI_API_DEV_KEY!,
  }),
]);
// chat is actuall limited to 300 rpm. but response time seems unstable at that rate
app.post("/openai/chat", [rateLimit(300), validateHitsToken, chat({ endpoint: process.env.OPENAI_CHAT_ENDPOINT!, key: process.env.OPENAI_API_PROD_KEY! })]);
app.post("/openai/chat/v3.5-turbo", [
  rateLimit(300),
  validateHitsToken,
  chat({ endpoint: process.env.OPENAI_CHAT_ENDPOINT!, key: process.env.OPENAI_API_PROD_KEY! }),
]);
app.post("/openai/chat/v4-8k", [
  rateLimit(1),
  validateHitsToken,
  chat({ endpoint: process.env.OPENAI_CHAT_ENDPOINT_V4_8K!, key: process.env.OPENAI_API_DEV_KEY! }),
]);
app.post("/openai/chat/v4-32k", [
  rateLimit(1),
  validateHitsToken,
  chat({ endpoint: process.env.OPENAI_CHAT_ENDPOINT_V4_32K!, key: process.env.OPENAI_API_DEV_KEY! }),
]);
app.post("/openai/embeddings", [
  rateLimit(300),
  validateHitsToken,
  embedding({ endpoint: process.env.OPENAI_CHAT_ENDPOINT_V4_32K!, key: process.env.OPENAI_API_PROD_KEY! }),
]);

app.post("/web/search", [validateHitsToken, webSearch]);
app.post("/web/crawl", [validateHitsToken, webCrawl]);

app.post("/arxiv/search", [validateHitsToken, arxivSearch]);

app.post("/hits/token", hitsToken);
app.post("/hits/signinstatus", hitsSignInStatus);
app.post("/hits/signin", hitsSignIn);
app.post("/hits/signout", hitsSignOut);
app.use("/hits/api", [requireJwt, hitsApi]);
app.use("/hits/search/claims", [validateHitsToken, hitsUATSearch("/indexes/hits-claims/docs/search?api-version=2021-04-30-Preview")]);

app.use(logRoute);
app.use(logError);

app.listen(port);
console.log(`[auth-server] Listening at port ${port}`);
