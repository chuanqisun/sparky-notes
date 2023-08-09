import { useCallback, useEffect, useMemo, useState } from "react";
import { TOKEN_CACHE_KEY, getInitialToken } from "../client/access-token";
import { embeddedSignIn, getAccessToken, signOutRemote } from "../client/auth";
import { initAuthClient } from "../client/init";
import { useConfig } from "./use-config";
import { useLocalStorage } from "./use-local-storage";

export interface UseAuthConfig {
  hitsAuthEndpoint: string;
  webHost: string;
}
export function useAuth({ hitsAuthEndpoint, webHost }: UseAuthConfig) {
  const [isConnected, setIsConnected] = useState<boolean | undefined>(undefined);

  useEffect(initAuthClient, []);
  const hitsConfig = useConfig();

  const timedToken = useLocalStorage({
    key: TOKEN_CACHE_KEY,
    getInitialValue: getInitialToken,
  });

  // 1 minute safety margin
  const isTokenExpired = useMemo(() => Date.now() + 60 * 1000 > timedToken.value.expireAt, [timedToken.value]);

  useEffect(() => {
    const refreshToken = () =>
      getAccessToken({
        input: { email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId },
        hitsAuthEndpoint,
      })
        .then((token) => {
          timedToken.update(token);
          setIsConnected(true);
        })
        .catch(() => setIsConnected(false));

    const interval = setInterval(() => {
      getAccessToken({
        input: { email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId },
        hitsAuthEndpoint,
      })
        .then((token) => {
          timedToken.update(token);
          setIsConnected(true);
        })
        .catch(() => setIsConnected(false));
    }, 5 * 60 * 1000); // HACK: 5 min token refresh interval is just magic number. Should use token expire_in
    refreshToken();

    return () => clearInterval(interval);
  }, [hitsConfig.value.idToken]);

  const signIn = useCallback(() => {
    setIsConnected(undefined);
    embeddedSignIn({ hitsAuthEndpoint, webHost }).then((result) => {
      hitsConfig.update({ ...hitsConfig.value, email: result.email, idToken: result.id_token, userClientId: result.userClientId });
      location.reload();
    });
  }, []);

  const signOut = useCallback(() => {
    localStorage.clear();

    signOutRemote({
      input: { email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId },
      hitsAuthEndpoint,
    }).then(() => {
      hitsConfig.reset();
    });
  }, [hitsConfig.value]);

  return {
    accessToken: timedToken.value.token,
    isTokenExpired,
    isConnected,
    signIn,
    signOut,
  };
}
