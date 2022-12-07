import axios from "axios";
import { getPostData } from "../utils/get-body-data.mjs";

const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const AAD_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";

const inMemTokenStore = new Map();

/**
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
export async function handleDevicecode(req, res) {
  const requestData = new URLSearchParams({
    client_id: AAD_CLIENT_ID,
    scope: `${HITS_API_RESOURCE_ID}/.default offline_access`,
  });
  const requestConfig = {
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/devicecode`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: requestData,
  };
  const { data } = await axios(requestConfig);

  const { user_code, device_code, expires_in = 900, interval = 5 } = data;

  poll({ device_code, intervalMs: interval * 1000, timeoutMs: expires_in * 1000 })
    .then((tokenResult) => {
      const now = Date.now();

      // clean up tokens that will expire soon
      inMemTokenStore.forEach((token, key) => {
        if (token.expires_at + 60 * 1000 < now) {
          inMemTokenStore.delete(key);
        }
      });

      const autResultWithExpiry = {
        ...tokenResult,
        expires_at: tokenResult.expires_in * 1000 + now,
      };

      // set new token
      inMemTokenStore.set(device_code, autResultWithExpiry);

      console.log(`[devicecode] Poll success`);
    })
    .catch((error) => {
      console.error(`[devicecode] Poll error`, error);
    });

  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "GET" });
  return res.end(JSON.stringify(data));
}

export async function handleToken(req, res) {
  const body = await getPostData(req);

  const { device_code } = JSON.parse(body);

  const data = inMemTokenStore.get(device_code);

  if (!data) {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "POST" });
    res.end(JSON.stringify(null));
  } else {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "POST" });
    return res.end(JSON.stringify(data));
  }
}

export async function handleTokenRefresh(req, res) {
  const body = await getPostData(req);

  const { refresh_token: old_refresh_token } = JSON.parse(body);

  const refreshData = {
    client_id: AAD_CLIENT_ID,
    scope: `${HITS_API_RESOURCE_ID}/.default offline_access`,
    old_refresh_token,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  };
  const refreshConfig = {
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: refreshData,
  };

  const { tokenResult } = await axios(refreshConfig);

  inMemTokenStore.forEach((token, key) => {
    if (token.expires_at + 60 * 1000 < now) {
      inMemTokenStore.delete(key);
    }
  });

  const now = Date.now();
  const tokenResultWithExpiry = {
    ...tokenResult,
    expires_at: tokenResult.expires_in * 1000 + now,
  };

  res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "POST" });
  return res.end(JSON.stringify(tokenResultWithExpiry));
}

async function poll({ device_code, intervalMs, timeoutMs }) {
  console.log(`[devicecode] Start polling every ${intervalMs}ms, timeout in ${timeoutMs}ms`);

  const pollData = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    code: device_code,
    client_id: AAD_CLIENT_ID,
  });
  const pollConfig = {
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: pollData,
  };

  const authResult = await new Promise((resolve, reject) => {
    const poller = setInterval(async () => {
      try {
        const pollResponse = await axios(pollConfig);
        clearInterval(poller);
        clearTimeout(timeout);
        resolve(pollResponse.data);
      } catch {}
    }, intervalMs);

    const timeout = setTimeout(() => {
      clearInterval(poller);
      reject("Timeout");
    }, timeoutMs);
  });

  return authResult;
}
