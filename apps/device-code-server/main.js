const axios = require("axios");
const qs = require("qs");

async function main() {
  const requestData = qs.stringify({
    client_id: "325dce49-3946-473a-9427-cd186fa462c2",
    scope: "user.read offline_access",
  });
  const requestConfig = {
    method: "post",
    url: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/oauth2/v2.0/devicecode",
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
    client_id: "325dce49-3946-473a-9427-cd186fa462c2",
  });
  const pollConfig = {
    method: "post",
    url: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47/oauth2/v2.0/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: pollData,
  };

  setInterval(async () => {
    console.log("polling...");

    try {
      const pollResponse = await axios(pollConfig);
      console.log(pollResponse.data);
    } catch {
      console.log("no response yet");
    }
  }, 5000);
}

main();
