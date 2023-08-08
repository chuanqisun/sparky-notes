import assert from "assert";
import axios from "axios";
import type { Request, RequestHandler } from "express";
import type { AsyncResponse } from "./_async-response";
import { bufferedUserTable, updateUserInTable } from "./_user-table";

export interface GetTokenInput {
  email: string;
  userClientId: string;
  id_token: string;
}

export type GetTokenOutput = {
  token: string;
  expireIn: number; // Seconds
  expireAt: number; // Unix timestamp
};

export const hitsToken: RequestHandler = async (req, res, next) => {
  try {
    const { data, status } = await getToken(req);
    res.status(status).json(data);
    next();
  } catch (e) {
    next(e);
  }
};

export async function getToken(req: Request): AsyncResponse<GetTokenOutput | string> {
  const input: GetTokenInput = req.body;

  assert(typeof input.id_token === "string");
  assert(typeof input.email === "string");
  assert(typeof input.userClientId === "string");

  const users = bufferedUserTable.read();
  const user = users.find((user) => user.email === input.email && user.id_token === input.id_token && user.userClientId === input.userClientId);

  if (!user) {
    return {
      status: 404,
      data: "access_token not found",
    };
  }

  assert(typeof process.env.AAD_CLIENT_ID === "string");
  assert(typeof process.env.OAUTH_SCOPES === "string");
  assert(typeof process.env.AAD_CLIENT_SECRET === "string");

  // try get access token
  const params = new URLSearchParams({
    client_id: process.env.AAD_CLIENT_ID as string,
    scope: process.env.OAUTH_SCOPES as string,
    refresh_token: user.refresh_token,
    grant_type: "refresh_token",
    client_secret: process.env.AAD_CLIENT_SECRET as string,
  });

  const response = await axios({
    method: "post",
    url: `https://login.microsoftonline.com/${process.env.AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Host: "" },
    data: params.toString(),
  });

  if (!response.data?.access_token) {
    return {
      status: response.status,
      data: response.statusText ?? "error referesh token",
    };
  }

  // HACK: read user table again to reduce chance of race condition
  const users2 = bufferedUserTable.read();
  // roll the refresh token, but keep the old email and id_token
  const updatedUsers = updateUserInTable(users2, { ...response.data, email: input.email, id_token: input.id_token, userClientId: input.userClientId });
  bufferedUserTable.write(updatedUsers);

  return {
    status: response.status,
    data: {
      token: response.data.access_token,
      expireIn: response.data.expires_in,
      expireAt: response.data.expires_in * 1000 + Date.now(),
    },
  };
}
