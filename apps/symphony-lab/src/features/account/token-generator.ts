import { embeddedSignIn, getAccessToken } from "./auth";
import { CONFIG_CACHE_KEY, getInitialConfig, type HitsConfig } from "./config";
import { getJson, setJson } from "./storage";

export function getTokenGenerator() {
  const events = new EventTarget();

  const emitToken = (token: string) => events.dispatchEvent(new CustomEvent("token", { detail: token }));

  const hitsConfig = getJson<HitsConfig>(CONFIG_CACHE_KEY) ?? getInitialConfig();

  const start = async () => {
    await getAccessToken({ email: hitsConfig.email, id_token: hitsConfig.idToken, userClientId: hitsConfig.userClientId })
      .then((res) => res.token)
      .then(emitToken)
      .catch(() => events.dispatchEvent(new CustomEvent("signed-out")));

    setInterval(() => {
      getAccessToken({ email: hitsConfig.email, id_token: hitsConfig.idToken, userClientId: hitsConfig.userClientId })
        .then((res) => res.token)
        .then(emitToken);
    }, 5 * 60 * 1000); // HACK: 5 min token refresh interval is just magic number. Should use token expire_in
  };

  const signIn = () =>
    embeddedSignIn().then((result) => {
      setJson(CONFIG_CACHE_KEY, { ...hitsConfig, email: result.email, idToken: result.id_token, userClientId: result.userClientId });
      location.reload();
    });

  return {
    start,
    signIn,
    events,
  };
}
