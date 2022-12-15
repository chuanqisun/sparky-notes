import { useCallback, useEffect, useState } from "preact/hooks";
import { useLocalStorage } from "../../utils/use-local-storage";
import { embeddedSignIn, getAccessToken, signOutRemote } from "./auth";
import { useConfig } from "./use-config";

export const TOKEN_CACHE_KEY = "cached-token";

export function useAuth() {
  const [isConnected, setIsConnected] = useState<boolean | undefined>(undefined);

  const hitsConfig = useConfig();

  const timedToken = useLocalStorage({
    namespace: "access-token",
    getInitialValue: () => ({ token: "", expireIn: 0 }),
  });

  useEffect(() => {
    if (!hitsConfig.value.email || !hitsConfig.value.idToken) return;

    const refreshToken = () =>
      getAccessToken({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId })
        .then((token) => {
          timedToken.update(token);
          setIsConnected(true);
        })
        .catch(() => setIsConnected(false));

    const interval = setInterval(() => {
      getAccessToken({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId })
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
      hitsConfig.update({ ...hitsConfig.value, email: result.email, idToken: result.id_token, userClientId: result.userClientId });
      location.reload();
    });
  }, []);

  const signOut = useCallback(() => {
    localStorage.clear();

    signOutRemote({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId }).then(() => {
      hitsConfig.reset();
    });
  }, [hitsConfig.value]);

  return {
    accessToken: timedToken.value.token,
    isConnected,
    signIn,
    signOut,
  };
}
