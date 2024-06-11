import cors from "cors";
import express from "express";
import { requireJwt } from "./modules/auth/require-jwt";
import { hitsSearchIndex } from "./modules/hits/api";
import { hitsSignIn } from "./modules/hits/sign-in";
import { hitsSignInStatus } from "./modules/hits/sign-in-status";
import { hitsSignOut } from "./modules/hits/sign-out";
import { hitsToken } from "./modules/hits/token";
import { hitsUATSearch } from "./modules/hits/uat-search";
import { validateHitsToken } from "./modules/hits/validate-hits-token";
import { logError } from "./modules/logging/log-error";
import { logRoute } from "./modules/logging/log-route";
import { chatRoute, loadOpenAIProxies } from "./modules/openai/plexchat";
import { withGracefulShutdown } from "./utils/graceful-shutdown";

const port = process.env.PORT || 5201;
const app = express();

app.use(cors());

// proxy middleware must be registered before express.json()
// ref: https://github.com/chimurai/http-proxy-middleware/issues/320
app.use("/hits/search/claims", [validateHitsToken, hitsUATSearch("/indexes/hits-claims/docs/search?api-version=2021-04-30-Preview")]);

app.use(express.json());
app.post("/hits/api/search/index", [requireJwt, hitsSearchIndex]);

app.post("/openai/plexchat", [validateHitsToken, chatRoute(loadOpenAIProxies().chatProxy, loadOpenAIProxies().abort)]);

app.post("/hits/token", hitsToken);
app.post("/hits/signinstatus", hitsSignInStatus);
app.post("/hits/signin", hitsSignIn);
app.post("/hits/signout", hitsSignOut);

app.use(logRoute);
app.use(logError);

withGracefulShutdown(app.listen(port));

console.log(`[auth-server] Listening at port ${port}`);
