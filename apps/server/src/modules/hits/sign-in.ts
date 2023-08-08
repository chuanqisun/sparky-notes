import { identity } from "@h20/auth";
import assert from "assert";
import axios from "axios";
import crypto from "crypto";
import type { Request, RequestHandler } from "express";
import { parseJwtBody } from "../../utils/jwt";
import type { AsyncResponse } from "./_async-response";
import { bufferedUserTable, updateUserInTable } from "./_user-table";

export const hitsSignIn: RequestHandler = async (req, res, next) => {
  try {
    const { data, status } = await signIn(req);
    res.status(status).json(data);
    next();
  } catch (e) {
    next(e);
  }
};

export interface SignInInput {
  code: string;
  code_verifier: string;
}

export interface SignInOutput {
  email: string;
  userClientId: string;
  id_token: string;
}

export async function signIn(req: Request): AsyncResponse<SignInOutput> {
  const input: SignInInput = req.body;
  const redirectHost = req.get("origin");

  assert(typeof input.code === "string");
  assert(typeof input.code_verifier === "string");

  const { code, code_verifier } = input;

  const params = new URLSearchParams({
    client_id: identity.AAD_CLIENT_ID,
    scope: identity.OAUTH_SCOPES,
    code: code as string,
    redirect_uri: `${redirectHost}/auth-redirect.html`,
    grant_type: "authorization_code",
    code_verifier: code_verifier as string,
    client_secret: process.env.AAD_CLIENT_SECRET as string,
  });

  const response = await axios({
    method: "post",
    url: `https://login.microsoftonline.com/${identity.AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Host: "" },
    data: params.toString(),
  });

  assert(typeof response?.data?.id_token === "string");
  const jwt = parseJwtBody(response.data.id_token);
  const { email } = jwt;
  assert(typeof email === "string");

  const userClientId = crypto.randomUUID();

  const users = bufferedUserTable.read();
  const updatedUsers = updateUserInTable(users, { ...response.data, email, code_verifier, userClientId });
  bufferedUserTable.write(updatedUsers);

  console.log("[signin] sign in success");
  return {
    status: response.status,
    data: {
      email,
      userClientId,
      id_token: response.data.id_token,
    },
  };
}
