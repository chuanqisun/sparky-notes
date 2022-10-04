import axios from "axios";
import { getPostData } from "../utils/get-body-data.mjs";

/**
 *
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
export async function handleGraphql(req, res) {
  const existingHeaders = req.headers;
  delete existingHeaders.origin;
  delete existingHeaders.host;
  console.log(existingHeaders);
  const body = await getPostData(req);

  // request(
  //   { url: "https://hits.microsoft.com/graphql", method: "POST", json: JSON.parse(body), headers: { ...existingHeaders } },
  //   function (error, response, body) {
  //     if (error) {
  //       console.error("error", error);
  //       res.writeHead(400, { "Content-Type": "application/json" });
  //       res.end(JSON.stringify({ message: "Invalid graphql request" }));
  //     }
  //   }
  // ).pipe(res);

  const requestConfig = {
    method: "post",
    url: `https://hits.microsoft.com/graphql`,
    headers: {
      ...existingHeaders,
    },
    data: JSON.parse(body),
  };
  const { data } = await axios(requestConfig);

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Allow-Headers": "*",
  });
  return res.end(JSON.stringify(data));
}
