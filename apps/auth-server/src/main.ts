import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getInteractiveSignInStatus, getToken, signIn } from "./controllers/hits";

dotenv.config();

const port = process.env.PORT || 5201;
const app = express();

app.use(express.json());
app.use(cors());

app.post("/hits/token", async (req, res) => {
  const { data, status } = await getToken(req.body);
  console.log("/hits/token", status);
  return res.status(status).json(data);
});

app.post("/hits/signinstatus", async (req, res) => {
  const { data, status } = await getInteractiveSignInStatus(req.body);
  console.log("/hits/signinstatus", status);
  return res.status(status).json(data);
});

app.post("/hits/signin", async (req, res) => {
  const { data, status } = await signIn(req.body);
  console.log("/hits/signin", status);
  return res.status(status).json(data);
});

app.listen(port);
console.log(`[auth-server] Listening at port ${port}`);
