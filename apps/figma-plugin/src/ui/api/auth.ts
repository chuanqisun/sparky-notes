const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";
const API_BASE_URL = "https://hits-figma-proxy.azurewebsites.net";

export interface AuthServiceConfig {
  onTokenChange: (token: TokenSummary | null) => any;
}
export interface DeviceCodeSummary {
  device_code: string;
  expires_in: number;
  interval: number;
  message: string;
  user_code: string;
  verification_uri: string;
}

export class AuthService {
  constructor(private config: AuthServiceConfig) {
    observeTokenChange(config.onTokenChange);
  }

  async signIn(): Promise<DeviceCodeSummary> {
    const deviceCodeSummary = await getDeviceCode();

    // background task
    getTokenByPolling({
      device_code: deviceCodeSummary.device_code,
      timeoutMs: deviceCodeSummary.expires_in * 1000,
      intervalMs: deviceCodeSummary.interval * 1000,
    })
      .then((tokenSummary) => {
        setStoreToken(tokenSummary);
        this.config.onTokenChange(tokenSummary);
      })
      .catch((e) => {
        console.error("Token polling failed", e);
        this.config.onTokenChange(null);
      });

    return deviceCodeSummary;
  }

  async signOut(): Promise<void> {
    await setStoreToken(null);
    this.config.onTokenChange(null);
  }
}

export async function getDeviceCode(): Promise<DeviceCodeSummary> {
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
    expires_at: Date.now() + tokenResult.expires_in * 1000,
  };
}

export async function observeTokenChange(onTokenChange?: (token: TokenSummary | null) => any) {
  const task = async () => {
    const storedToken = await getStoreToken();

    if (!storedToken) {
      onTokenChange?.(null);
      return;
    }

    if (storedToken.expires_at < Date.now() + 60 * 1000) {
      // less than 1 minute left, consider as expired
      onTokenChange?.(null);
    }

    try {
      const newToken = await getTokenByRefresh(storedToken);
      setStoreToken(newToken);
      onTokenChange?.(newToken);
    } catch {
      onTokenChange?.(null);
    }
  };

  setInterval(task, 10000);
  task();
}

export interface GetTokenByRefreshInput {
  refresh_token: string;
}
export async function getTokenByRefresh({ refresh_token }: GetTokenByRefreshInput): Promise<TokenSummary> {
  const refreshData = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: AAD_CLIENT_ID,
    scope: `${HITS_API_RESOURCE_ID}/.default offline_access`,
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
    expires_at: Date.now() + tokenResult.expires_in * 1000,
  };
}

export async function getStoreToken() {
  return new Promise<TokenSummary | undefined>((resolve) => {
    window.onmessage = (event) => {
      if (event.data?.pluginMessage?.type === "storedToken") {
        const tokenSummary = event.data.pluginMessage.token as TokenSummary | undefined;
        resolve(tokenSummary);
      }
    };
    parent.postMessage({ pluginMessage: { type: "getToken" } }, "https://www.figma.com");
  });
}

export async function setStoreToken(token: TokenSummary | null) {
  parent.postMessage({ pluginMessage: { type: "setToken", token } }, "https://www.figma.com");
}
