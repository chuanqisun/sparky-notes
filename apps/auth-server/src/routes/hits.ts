import { authConfig } from "@h20/auth";
import assert from "assert";
import axios from "axios";
import crypto from "crypto";
import type { Request } from "express";
import path from "path";
import { BufferedJsonFile } from "../utils/fs";
import { parseJwt } from "../utils/jwt";

export interface SignInInput {
  code: string;
  code_verifier: string;
}

export type Response<T> = Promise<{
  status: number;
  data?: T;
}>;

export interface SignInOutput {
  email: string;
  userClientId: string;
  id_token: string;
}

const bufferedUserTable = new BufferedJsonFile<any[]>(path.join(process.cwd(), "db", "users.json")).init("[]");

export async function signIn(req: Request): Response<SignInOutput> {
  const input: SignInInput = req.body;
  const redirectHost = req.get("origin");

  assert(typeof input.code === "string");
  assert(typeof input.code_verifier === "string");

  const { code, code_verifier } = input;
  const userTable = path.join(process.cwd(), "db", "users.json");

  const params = new URLSearchParams({
    client_id: authConfig.AAD_CLIENT_ID,
    scope: authConfig.OAUTH_SCOPES,
    code: code as string,
    redirect_uri: `${redirectHost}/auth-redirect.html`,
    grant_type: "authorization_code",
    code_verifier: code_verifier as string,
    client_secret: process.env.AAD_CLIENT_SECRET as string,
  });

  const response = await axios({
    method: "post",
    url: `https://login.microsoftonline.com/${authConfig.AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Host: "" },
    data: params.toString(),
  });

  assert(typeof response?.data?.id_token === "string");
  const jwt = parseJwt(response.data.id_token);
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

export interface SignOutInput {
  email: string;
  id_token: string;
  userClientId: string;
}

export type SignOutOutput = {};

export async function signOut(req: Request): Response<SignOutOutput> {
  const input: SignOutInput = req.body;

  const users = bufferedUserTable.read();
  const user = users.find((user) => user.email === input.email && user.id_token === input.id_token && user.userClientId === input.userClientId);

  if (!user) {
    return {
      status: 404,
    };
  }

  const updatedUsers = removeUserInTable(users, user);
  bufferedUserTable.write(updatedUsers);

  return {
    status: 200,
    data: {},
  };
}

export interface GetSignInStatusInput {
  code_verifier: string;
}

export interface SignInStatusOutput {
  email: string;
  id_token: string;
  userClientId: string;
}

export async function getInteractiveSignInStatus(req: Request): Response<SignInStatusOutput> {
  const input = req.body;

  assert(typeof input.code_verifier === "string");
  return new Promise<any>((resolve) => {
    const pollId = setInterval(async () => {
      const users = bufferedUserTable.read();
      const user = users.find((user) => user.code_verifier === input.code_verifier);
      if (user) {
        clearInterval(pollId);
        clearTimeout(timeoutId);

        // exclude verifier in the table. We use it only once
        const { code_verifier, ...userWithoutVerifier } = user;

        const updatedUsers = updateUserInTable(users, userWithoutVerifier);
        bufferedUserTable.write(updatedUsers);

        resolve({
          status: 200,
          data: {
            email: user.email,
            id_token: user.id_token,
            userClientId: user.userClientId,
          },
        });
      }
    }, 3000);

    const timeoutId = setTimeout(() => {
      clearInterval(pollId);
      resolve({ status: 408 });
    }, 60000);
  }).catch(() => {
    return {
      status: 500,
    };
  });
}

export interface GetTokenInput {
  email: string;
  userClientId: string;
  id_token: string;
}

export type GetTokenOutput = string;

export async function getToken(req: Request): Response<string> {
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

  // try get access token
  const params = new URLSearchParams({
    client_id: authConfig.AAD_CLIENT_ID,
    scope: authConfig.OAUTH_SCOPES,
    refresh_token: user.refresh_token,
    grant_type: "refresh_token",
    client_secret: process.env.AAD_CLIENT_SECRET as string,
  });

  const response = await axios({
    method: "post",
    url: `https://login.microsoftonline.com/${authConfig.AAD_TENANT_ID}/oauth2/v2.0/token`,
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
    data: response.data.access_token,
  };
}

async function getUser(token: string) {
  const result = await axios("https://hits.microsoft.com/api/classic/user/findoradduser", {
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return result.data;
}

function updateUserInTable<T extends { email: string; userClientId: string }>(table: T[], userToUpdate: T) {
  return [
    { ...userToUpdate, email: userToUpdate.email },
    // ensure uniqueness by using (email, userClientId) tuple as a multi-column key
    ...table.filter((user) => user.email !== userToUpdate.email || user.userClientId !== userToUpdate.userClientId),
  ];
}

function removeUserInTable<T extends { email: string; userClientId: string }>(table: T[], userToRemove: T) {
  return table.filter((user) => user.email !== userToRemove.email || user.userClientId !== userToRemove.userClientId);
}
