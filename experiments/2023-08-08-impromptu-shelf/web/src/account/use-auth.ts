import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "../utils/use-local-storage";
import { TOKEN_CACHE_KEY, getInitialToken } from "./access-token";
import { embeddedSignIn, getAccessToken, signOutRemote } from "./auth";
import { useConfig } from "./use-config";

export function useAuth() {
  const [isConnected, setIsConnected] = useState<boolean | undefined>(undefined);

  const hitsConfig = useConfig();

  const timedToken = useLocalStorage({
    key: TOKEN_CACHE_KEY,
    getInitialValue: getInitialToken,
  });

  // 1 minute safety margin
  const isTokenExpired = useMemo(() => Date.now() + 60 * 1000 > timedToken.value.expireAt, [timedToken.value]);

  useEffect(() => {
    const refreshToken = () =>
      getAccessToken({ email: hitsConfig.value.email, idToken: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId })
        .then((token) => {
          timedToken.update(token);
          setIsConnected(true);
        })
        .catch(() => setIsConnected(false));

    const interval = setInterval(() => {
      getAccessToken({ email: hitsConfig.value.email, idToken: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId })
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
    embeddedSignIn().then((result) => {
      hitsConfig.update({ ...hitsConfig.value, email: result.email, idToken: result.idToken, userClientId: result.userClientId });
      location.reload();
    });
  }, []);

  const signOut = useCallback(() => {
    localStorage.clear();

    signOutRemote({ email: hitsConfig.value.email, idToken: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId }).then(() => {
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
