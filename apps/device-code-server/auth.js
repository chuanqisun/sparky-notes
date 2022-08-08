const axios = require("axios");
const qs = require("qs");

const { search } = require("./graphql");

const AAD_CLIENT_ID = "bc9d8487-53f6-418d-bdce-7ed1f265c33a";
const AAD_TENANT_ID = "72f988bf-86f1-41af-91ab-2d7cd011db47";
const HITS_API_RESOURCE_ID = "https://microsoft.onmicrosoft.com/MSFT_HITS_API";

async function main() {
  // test graphql access

  const requestData = qs.stringify({
    client_id: AAD_CLIENT_ID,
    scope: `${HITS_API_RESOURCE_ID}/.default offline_access`,
  });
  const requestConfig = {
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/devicecode`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: requestData,
  };
  const { data: requestResult } = await axios(requestConfig);

  console.log(requestResult.message);

  const pollData = qs.stringify({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    code: requestResult.device_code,
    client_id: AAD_CLIENT_ID,
  });
  const pollConfig = {
    method: "post",
    url: `https://login.microsoftonline.com/${AAD_TENANT_ID}/oauth2/v2.0/token`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: pollData,
  };

  const authResult = await new Promise((resolve, reject) => {
    const poller = setInterval(async () => {
      console.log("polling...");

      try {
        const pollResponse = await axios(pollConfig);
        console.log(pollResponse.data);
        clearInterval(poller);
        clearTimeout(timeout);
        resolve(pollResponse.data);
      } catch {}
    }, 5000);

    const timeout = setTimeout(() => {
      clearInterval(poller);
      reject("Timeout");
    }, 120000); // 2 min
  });

  console.log(authResult);
  const { access_token, refresh_token } = authResult;

  const searchResult = await search({ phrase: "gaming", token: access_token });
  console.log(searchResult);
}

main();
