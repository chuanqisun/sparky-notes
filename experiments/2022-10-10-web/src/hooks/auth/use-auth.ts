import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { AuthService, DeviceCodeSummary, TokenSummary } from "./auth-utils";

export function useAuth() {
  const [token, setToken] = useState<TokenSummary | null | undefined>();
  const authService = useMemo(() => new AuthService({ onTokenChange: setToken }), []);

  const [prompt, setPrompt] = useState<DeviceCodeSummary | null>(null);

  const signIn = useCallback(() => {
    setAuthState("signing-in");
    authService.signIn().then(setPrompt);
  }, []);
  const signOut = useCallback(() => authService.signOut(), []);

  const [authState, setAuthState] = useState<"pre-auth" | "signed-in" | "signing-in" | "signed-out">("pre-auth");

  useEffect(() => {
    switch (token) {
      case null:
        setAuthState("signed-out");
        break;
      case undefined:
        setAuthState("pre-auth");
        break;
      default:
        setAuthState("signed-in");
    }
  }, [token]);

  return {
    authState,
    token,
    signIn,
    signOut,
    prompt,
  };
}
