import assert from "assert";
import axios from "axios";
import path from "path";
import { readFileSafe, writeJsonFile } from "../utils/fs";

const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const AAD_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";
const GRAPH_API_RESOURCE_ID = "https://graph.microsoft.com";

export interface SignInProps {
  code: string;
  code_verifier: string;
}
export async function signIn(props: SignInProps) {
  const { code, code_verifier } = props;
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

  const users = JSON.parse((await readFileSafe(userTable)) ?? "[]");
  const updatedUsers = updateUserTable(users, { ...response.data, email });
  await writeJsonFile(userTable, updatedUsers);

  console.log("[signin] sign in success");
  return {
    status: response.status,
    data: {
      email,
      id_token: response.data.id_token,
    },
  };
}

export interface GetTokenProps {
  email: string;
  id_token: string;
}

export interface GetTokenResponse {
  status: number;
  data: string;
}

export async function getToken(props: GetTokenProps): Promise<GetTokenResponse> {
  const userTable = path.join(process.cwd(), "db", "users.json");
  const users = JSON.parse((await readFileSafe(userTable)) ?? "[]") as any[];
  const user = users.find((user) => user.email === props.email && user.id_token === props.id_token);

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
  const updatedUsers = updateUserTable(users2, { ...response.data, email: props.email, id_token: props.id_token });
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
