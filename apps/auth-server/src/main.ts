import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getInteractiveSignInStatus, getToken, signIn, signOut } from "./routes/hits";

dotenv.config();

const port = process.env.PORT || 5201;
const app = express();

app.use(express.json());
app.use(cors());

app.post("/hits/token", async (req, res) => {
  try {
    const { data, status } = await getToken(req.body);
    console.log("/hits/token", status);
    return res.status(status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
});

app.post("/hits/signinstatus", async (req, res) => {
  try {
    const { data, status } = await getInteractiveSignInStatus(req.body);
    console.log("/hits/signinstatus", status);
    return res.status(status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
});

app.post("/hits/signin", async (req, res) => {
  try {
    const { data, status } = await signIn(req.body);
    console.log("/hits/signin", status);
    return res.status(status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
});

app.post("/hits/signout", async (req, res) => {
  try {
    const { data, status } = await signOut(req.body);
    console.log("/hits/signout", status);
    return res.status(status).json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
});

app.listen(port);
console.log(`[auth-server] Listening at port ${port}`);
