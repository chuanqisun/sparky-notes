import { getJson, setJson } from "../../utils/local-storage";
import { embeddedSignIn, getAccessToken } from "./auth";
import { CONFIG_CACHE_KEY, getInitialConfig, type HitsConfig } from "./config";

export async function getTokenGenerator() {
  const hitsConfig = getJson<HitsConfig>(CONFIG_CACHE_KEY) ?? getInitialConfig();
  let validToken = await getAccessToken({ email: hitsConfig.email, id_token: hitsConfig.idToken, userClientId: hitsConfig.userClientId })
    .then((res) => res.token)
    .catch(() =>
      embeddedSignIn().then((result) => {
        setJson(CONFIG_CACHE_KEY, { ...hitsConfig, email: result.email, idToken: result.id_token, userClientId: result.userClientId });
        location.reload();
      })
    );

  setInterval(() => {
    getAccessToken({ email: hitsConfig.email, id_token: hitsConfig.idToken, userClientId: hitsConfig.userClientId }).then((res) => (validToken = res.token));
  }, 5 * 60 * 1000); // HACK: 5 min token refresh interval is just magic number. Should use token expire_in

  const getToken = () => validToken!;

  return getToken;
}
