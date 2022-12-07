import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { constants } from "http2";
import { getReport } from "./routes/object";
import { parseJwt } from "./utils/jwt";

dotenv.config();

const port = process.env.PORT || 5203;
const app = express();

app.use(express.json());
app.use(cors());

// shared middleware for validating auth header
app.use(async (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authorization header required");
  const parsedToken = parseJwt(token);
  if (typeof parsedToken !== "object") return res.status(constants.HTTP_STATUS_FORBIDDEN).send("Authroization header format is invalid");
  next();
});

app.get("/report/:id", async (req, res, next) => {
  try {
    const { data, status } = await getReport(req);
    console.log("/report", status);
    res.status(status).json(data);
  } catch (e) {
    next(e);
  }
});

app.listen(port);
console.log(`[object-viewer] Listening at port ${port}`);
