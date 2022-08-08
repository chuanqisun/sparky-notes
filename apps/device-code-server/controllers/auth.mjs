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

  console.log(`[devicecode] Start polling every ${interval}s, timeout in ${expires_in}s`);

  poll({ device_code })
    .then((authResult) => {
      const now = Date.now();

      // clean up tokens that will expire soon
      inMemTokenStore.forEach((token, key) => {
        if (token.expires_at + 60 * 1000 < now) {
          inMemTokenStore.delete(key);
        }
      });

      const autResultWithExpiry = {
        ...authResult,
        expires_at: authResult.expires_in * 1000 + now,
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
    res.writeHead(404, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "POST" });
    res.end(JSON.stringify({ message: "device_code not found" }));
  } else {
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "POST" });
    return res.end(JSON.stringify(data));
  }
}

async function poll({ device_code }) {
  const pollData = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    code: device_code,
    client_id: AAD_CLIENT_ID,
  });
  const pollConfig = {
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Access-Control-Allow-Origin": "*",
    },
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
    }, 5000);

    const timeout = setTimeout(() => {
      clearInterval(poller);
      reject("Timeout");
    }, 120000); // 2 min
  });

  return authResult;
}
