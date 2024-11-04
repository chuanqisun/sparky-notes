import assert from "assert";
import axios from "axios";
import crypto from "crypto";
import type { Request, RequestHandler } from "express";
import { parseJwtBody } from "../../utils/jwt";
import type { AsyncResponse } from "./_async-response";
import { bufferedUserTable, updateUserInTable } from "./_user-table";
import { ClientAssertionCredential, ManagedIdentityCredential, type TokenCredential } from "@azure/identity";
import { ClientAssertion, ConfidentialClientApplication } from "@azure/msal-node";

const AUDIENCE = process.env.OAUTH_SCOPES?.split(" ") || [];
const RESOURCE_TENANT_ID = process.env.AAD_TENANT_ID || "";
const APP_CLIENT_ID = process.env.AAD_CLIENT_ID || "";
const APP_CLIENT_SECRET = process.env.AAD_CLIENT_SECRET || "";
const MANAGED_IDENTITY_ID = process.env.AAD_MANAGED_IDENTITY_ID || "";
const MANAGED_IDENTITY_AUDIENCE = process.env.AAD_MANAGED_IDENTITY_AUDIENCE ? [process.env.AAD_MANAGED_IDENTITY_AUDIENCE] : [];

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
  idToken: string;
}

export async function signIn(req: Request): AsyncResponse<SignInOutput> {
  const input: SignInInput = req.body;
  const redirectHost = req.get("origin");

  const { code, code_verifier } = input;

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

  const response = await cca.acquireTokenByCode({
    code,
    redirectUri: `${redirectHost}/auth-redirect.html`,
    scopes: AUDIENCE,
    codeVerifier: code_verifier,
  });

  assert(typeof response?.idToken === "string");
  const jwt = parseJwtBody(response.idToken);
  const { email, idToken, oid } = jwt;
  assert(typeof email === "string");

  const refreshToken = () => {
    const tokenCache = cca.getTokenCache().serialize();
    const refreshTokenObject = JSON.parse(tokenCache).RefreshToken;
    const refreshToken = refreshTokenObject[Object.keys(refreshTokenObject)[0]].secret;
    return refreshToken;
  };

  const userClientId = oid;

  const users = bufferedUserTable.read();
  const updatedUsers = updateUserInTable(users, { ...response, email, code_verifier, userClientId, refreshToken: refreshToken() });
  bufferedUserTable.write(updatedUsers);

  console.log("[signin] sign in success");
  return {
    status: 200,
    data: {
      email,
      userClientId,
      idToken: idToken,
    },
  };
}
