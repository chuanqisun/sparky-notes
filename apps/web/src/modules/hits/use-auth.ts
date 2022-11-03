import { useCallback, useEffect, useState } from "preact/hooks";
import { embeddedSignIn, getAccessToken, signOutRemote } from "./auth";
import { useConfig } from "./use-config";

export function useAuth() {
  const [isConnected, setIsConnected] = useState<boolean | undefined>(undefined);

  const hitsConfig = useConfig();

  useEffect(() => {
    if (!hitsConfig.value.email || !hitsConfig.value.idToken) return;

    getAccessToken({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId })
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));
  }, [hitsConfig.value.idToken]);

  const signIn = useCallback(() => {
    setIsConnected(undefined);
    embeddedSignIn().then((result) => {
      hitsConfig.update({ ...hitsConfig.value, email: result.email, idToken: result.id_token, userClientId: result.userClientId });
    });
  }, []);

  const signOut = useCallback(() => {
    signOutRemote({ email: hitsConfig.value.email, id_token: hitsConfig.value.idToken, userClientId: hitsConfig.value.userClientId }).then(() => {
      hitsConfig.reset();
    });
  }, [hitsConfig.value]);

  return {
    isConnected,
    signIn,
    signOut,
  };
}
