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

export interface TokenSummary {
  device_code: string;
  access_token: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
}

export async function getTokenByPolling({ device_code, intervalMs, timeoutMs }: GetTokenInput): Promise<TokenSummary> {
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

  const tokenResult = await new Promise<TokenSummary>((resolve, reject) => {
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

  return {
    ...tokenResult,
    device_code,
    expires_at: Date.now() + tokenResult.expires_in * 1000,
  };
}

export interface GetTokenByRefreshInput {
  device_code: string;
  refresh_token: string;
}
export async function getTokenByRefresh({ refresh_token, device_code }: GetTokenByRefreshInput): Promise<TokenSummary> {
  const refreshData = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    refresh_token,
    device_code,
    client_id: AAD_CLIENT_ID,
  });
  const refreshConfig = {
    method: "post",
    url: `${API_BASE_URL}/token`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: refreshData,
  };

  const tokenResult = await fetch(`${API_BASE_URL}/token`, refreshConfig).then((res) => res.json());

  return {
    ...tokenResult,
    device_code,
    expires_at: Date.now() + tokenResult.expires_in * 1000,
  };
}
