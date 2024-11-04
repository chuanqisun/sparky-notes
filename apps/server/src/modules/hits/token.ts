import assert from "assert";
import { ManagedIdentityCredential, ClientAssertionCredential, ClientSecretCredential } from "@azure/identity";
import type { TokenCredential } from "@azure/identity";
import type { Request, RequestHandler } from "express";
import type { AsyncResponse } from "./_async-response";
import { ClientAssertion, ConfidentialClientApplication } from "@azure/msal-node";
import { bufferedUserTable, updateUserInTable } from "./_user-table";

const AUDIENCE = process.env.OAUTH_SCOPES || "";
const RESOURCE_TENANT_ID = process.env.AAD_TENANT_ID || "";
const APP_CLIENT_ID = process.env.AAD_CLIENT_ID || "";
const APP_CLIENT_SECRET = process.env.AAD_CLIENT_SECRET || "";
const MANAGED_IDENTITY_ID = process.env.AAD_MANAGED_IDENTITY_ID || "";
const MANAGED_IDENTITY_AUDIENCE = process.env.AAD_MANAGED_IDENTITY_AUDIENCE ? [process.env.AAD_MANAGED_IDENTITY_AUDIENCE] : [];

export interface GetTokenInput {
  email: string;
  userClientId: string;
  idToken: string;
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

//handle request from user to get an access token
export async function getToken(req: Request): AsyncResponse<GetTokenOutput | string> {
  const input: GetTokenInput = req.body;

  assert(typeof input.idToken === "string");
  assert(typeof input.email === "string");
  assert(typeof input.userClientId === "string");

  const users = bufferedUserTable.read();
  const user = users.find((user) => user.email === input.email && user.idToken === input.idToken && user.userClientId === input.userClientId);

  if (!user) {
    return {
      status: 404,
      data: "access_token not found",
    };
  }

  async function getManagedIdentityAccessToken(credential: TokenCredential, audience: string[]): Promise<string> {
    const accessToken = await credential.getToken(audience);
    const token = accessToken?.token;
    if (!token) throw new Error(`Failed to obtain token for managed identity, received ${token}`);
    return token;
  }

  const msalConfig = {
    auth: {
      clientId: APP_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AAD_TENANT_ID}`,
      clientAssertion: async () => {
        const credential = new ManagedIdentityCredential(MANAGED_IDENTITY_ID);
        return getManagedIdentityAccessToken(credential, MANAGED_IDENTITY_AUDIENCE);
      },
    },
  };

  const cca = new ConfidentialClientApplication(msalConfig);

  const response = await cca.acquireTokenByRefreshToken({
    refreshToken: user.refreshToken,
    scopes: AUDIENCE.split(" "),
  });

  // HACK: read user table again to reduce chance of race condition
  const users2 = bufferedUserTable.read();
  // roll the refresh token, but keep the old email and idToken
  const updatedUsers = updateUserInTable(users2, {
    ...response,
    email: input.email,
    idToken: input.idToken,
    userClientId: input.userClientId,
    refreshToken: user.refreshToken,
  });
  bufferedUserTable.write(updatedUsers);

  return {
    status: 200,
    data: {
      token: response?.accessToken || "",
      expireIn: response?.expiresOn ? response.expiresOn.getTime() - Date.now() : 0,
      expireAt: response?.expiresOn?.getTime() || 0,
    },
  };
}
