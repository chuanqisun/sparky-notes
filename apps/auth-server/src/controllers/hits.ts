import assert from "assert";
import axios from "axios";
import crypto from "crypto";
import path from "path";
import { readFileSafe, writeJsonFile } from "../utils/fs";

const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const AAD_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";

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

export async function signIn(input: SignInInput): Response<SignInOutput> {
  assert(typeof input.code === "string");
  assert(typeof input.code_verifier === "string");

  const { code, code_verifier } = input;
  const userTable = path.join(process.cwd(), "db", "users.json");

  const params = new URLSearchParams({
    client_id: AAD_CLIENT_ID,
    scope: `${HITS_API_RESOURCE_ID}/.default offline_access openid`,
    code: code as string,
    redirect_uri: "http://localhost:5200/auth-redirect.html",
    grant_type: "authorization_code",
    code_verifier: code_verifier as string,
    client_secret: process.env.AAD_CLIENT_SECRET as string,
  });

  const response = await axios({
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded", Host: "" },
    data: params.toString(),
  });

  assert(typeof response?.data?.id_token === "string");
  console.log(response.data);
  const access_token = response.data.access_token;
  const hitsProfile = await getUser(access_token);
  assert(typeof hitsProfile?.user?.mail === "string");
  const email = hitsProfile.user.mail;

  const userClientId = crypto.randomUUID();

  const users = JSON.parse((await readFileSafe(userTable)) ?? "[]");
  const updatedUsers = updateUserTable(users, { ...response.data, email, code_verifier, userClientId });
  await writeJsonFile(userTable, updatedUsers);

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

export interface GetSignInStatusInput {
  code_verifier: string;
}

export interface SignInStatusOutput {
  email: string;
  id_token: string;
}

export async function getInteractiveSignInStatus(input: GetSignInStatusInput): Response<SignInStatusOutput> {
  assert(typeof input.code_verifier === "string");
  return new Promise<any>((resolve) => {
    const userTable = path.join(process.cwd(), "db", "users.json");

    const pollId = setInterval(async () => {
      const users = JSON.parse((await readFileSafe(userTable)) ?? "[]") as any[];
      const user = users.find((user) => user.code_verifier === input.code_verifier);
      if (user) {
        clearInterval(pollId);
        clearTimeout(timeoutId);

        // exclude verifier in the table. We use it only once
        const { code_verifier, ...userWithoutVerifier } = user;

        const updatedUsers = updateUserTable(users, userWithoutVerifier);
        await writeJsonFile(userTable, updatedUsers);

        resolve({
          status: 200,
          data: {
            email: user.email,
            id_token: user.id_token,
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
  id_token: string;
}

export type GetTokenOutput = string;

export async function getToken(input: GetTokenInput): Response<string> {
  assert(typeof input.id_token === "string");
  assert(typeof input.email === "string");

  const userTable = path.join(process.cwd(), "db", "users.json");
  const users = JSON.parse((await readFileSafe(userTable)) ?? "[]") as any[];
  const user = users.find((user) => user.email === input.email && user.id_token === input.id_token);

  if (!user) {
    return {
      status: 404,
      data: "access_token not found",
    };
  }

  // try get access token
  const params = new URLSearchParams({
    client_id: AAD_CLIENT_ID,
    scope: `${HITS_API_RESOURCE_ID}/.default offline_access openid`,
    refresh_token: user.refresh_token,
    grant_type: "refresh_token",
    client_secret: process.env.AAD_CLIENT_SECRET as string,
  });

  const response = await axios({
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/token`,
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
  const users2 = JSON.parse((await readFileSafe(userTable)) ?? "[]");
  // roll the refresh token, but keep the old email and id_token
  const updatedUsers = updateUserTable(users2, { ...response.data, email: input.email, id_token: input.id_token });
  await writeJsonFile(userTable, updatedUsers);

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

function updateUserTable<T extends { email: string }>(table: T[], userWithEmail: T) {
  return [{ ...userWithEmail, email: userWithEmail.email }, ...table.filter((user) => user.email !== userWithEmail.email)];
}
