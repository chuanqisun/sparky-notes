import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { logError } from "./middleware/log-error";
import { logRoute } from "./middleware/log-route";
import { requireToken } from "./middleware/require-token";
import { getReport } from "./routes/report";

dotenv.config();

const port = process.env.PORT || 5203;
const app = express();

app.use(express.json());
app.use(cors());

app.get("/report/:id", [requireToken, getReport]);

app.use(logRoute);
app.use(logError);

app.listen(port);
console.log(`[object-viewer] Listening at port ${port}`);
