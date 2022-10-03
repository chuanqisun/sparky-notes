import assert from "assert";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { getToken, signIn } from "./controllers/hits";

dotenv.config();

const port = process.env.PORT || 5002;
const app = express();

app.use(express.json());
app.use(cors());

app.post("/hits/token", async (req, res) => {
  assert(typeof req.body?.id_token === "string");
  assert(typeof req.body?.email === "string");

  const { data, status } = await getToken({ id_token: req.body.id_token, email: req.body.email });

  console.log("/hits/token", status);
  return res.status(status).json(data);
});

app.get("/hits/signin", async (req, res) => {
  assert(typeof req.query?.code === "string");
  assert(typeof req.query?.code_verifier === "string");

  const { data, status } = await signIn({
    code: req.query.code,
    code_verifier: req.query.code_verifier,
  });

  console.log("/hits/signin", status);
  return res.status(status).json(data);
});

app.listen(port);
console.log(`[aad-auth-server] Listening at port ${port}`);
