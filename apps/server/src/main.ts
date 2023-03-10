import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { requireJwt } from "./modules/auth/require-jwt";
import { hitsApi } from "./modules/hits/api";
import { hitsSignIn } from "./modules/hits/sign-in";
import { hitsSignInStatus } from "./modules/hits/sign-in-status";
import { hitsSignOut } from "./modules/hits/sign-out";
import { hitsToken } from "./modules/hits/token";
import { validateHitsToken } from "./modules/hits/validate-hits-token";
import { logError } from "./modules/logging/log-error";
import { logRoute } from "./modules/logging/log-route";
import { completions } from "./modules/openai/completion";
import { rateLimit } from "./modules/rate-limit/rate-limit";

dotenv.config();

const port = process.env.PORT || 5201;
const app = express();

app.use(express.json());
app.use(cors());

app.post("/openai/completions", [rateLimit(120), validateHitsToken, completions]);

app.post("/hits/token", hitsToken);
app.post("/hits/signinstatus", hitsSignInStatus);
app.post("/hits/signin", hitsSignIn);
app.post("/hits/signout", hitsSignOut);
app.use("/hits/api", [requireJwt, hitsApi]);

app.use(logRoute);
app.use(logError);

app.listen(port);
console.log(`[auth-server] Listening at port ${port}`);
