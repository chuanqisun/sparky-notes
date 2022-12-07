import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { requireToken } from "./middleware/require-token";
import { getReport } from "./routes/report";

dotenv.config();

const port = process.env.PORT || 5203;
const app = express();

app.use(express.json());
app.use(cors());

// shared middleware for validating auth header
app.use(requireToken);

app.get("/report/:id", getReport);

app.listen(port);
console.log(`[object-viewer] Listening at port ${port}`);
