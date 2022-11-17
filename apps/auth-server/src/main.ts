import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getInteractiveSignInStatus, getToken, signIn, signOut } from "./routes/hits";

dotenv.config();

const port = process.env.PORT || 5201;
const app = express();

app.use(express.json());
app.use(cors());

app.post("/hits/token", async (req, res, next) => {
  try {
    const { data, status } = await getToken(req);
    console.log("/hits/token", status);
    res.status(status).json(data);
  } catch (e) {
    next(e);
  }
});

app.post("/hits/signinstatus", async (req, res, next) => {
  try {
    const { data, status } = await getInteractiveSignInStatus(req);
    console.log("/hits/signinstatus", status);
    res.status(status).json(data);
  } catch (e) {
    next(e);
  }
});

app.post("/hits/signin", async (req, res, next) => {
  try {
    const { data, status } = await signIn(req);
    console.log("/hits/signin", status);
    res.status(status).json(data);
  } catch (e) {
    next(e);
  }
});

app.post("/hits/signout", async (req, res, next) => {
  try {
    const { data, status } = await signOut(req);
    console.log("/hits/signout", status);
    return res.status(status).json(data);
  } catch (e) {
    next(e);
  }
});

app.listen(port);
console.log(`[auth-server] Listening at port ${port}`);
