const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";
const API_BASE_URL = "http://localhost:5000";

export interface DeviceCodeOutput {
  device_code: string;
  expires_in: number;
  interval: number;
  message: string;
  user_code: string;
  verification_uri: string;
}

export async function getDeviceCode(): Promise<DeviceCodeOutput> {
  const requestData = new URLSearchParams({
    client_id: AAD_CLIENT_ID,
    scope: `${HITS_API_RESOURCE_ID}/.default offline_access`,
  });
  const requestConfig = {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: requestData,
  };
  const data = await fetch(`${API_BASE_URL}/devicecode`, requestConfig).then((res) => res.json());

  return data;
}

export interface GetTokenInput {
  device_code: string;
  intervalMs: number;
  timeoutMs: number;
}

export interface GetTokenOutput {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

export async function getToken({ device_code, intervalMs, timeoutMs }: GetTokenInput): Promise<GetTokenOutput> {
  const data = await poll({ device_code, intervalMs, timeoutMs });

  return data;
}

async function poll({ device_code, intervalMs, timeoutMs }) {
  console.log(`[auth] Start polling every ${intervalMs}ms, timeout in ${timeoutMs}ms`);

  const pollData = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    code: device_code,
    client_id: AAD_CLIENT_ID,
  });
  const pollConfig = {
    method: "post",
    url: `${API_BASE_URL}/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: pollData,
  };

  const authResult = await new Promise<GetTokenOutput>((resolve, reject) => {
    const poller = setInterval(async () => {
      const pollResponse = await fetch(`${API_BASE_URL}/token`, pollConfig).then((res) => res.json());
      if (pollResponse.error === "authorization_pending") return;

      clearInterval(poller);
      clearTimeout(timeout);
      resolve(pollResponse);
    }, intervalMs);

    const timeout = setTimeout(() => {
      clearInterval(poller);
      reject("Timeout");
    }, timeoutMs);
  });

  return authResult;
}
