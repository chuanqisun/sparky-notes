import http from "http";
import request from "request";
import { handleDevicecode, handleToken } from "./controllers/auth.mjs";

const server = http.createServer((req, res) => {
  if (req.url === "/api/graphql" && req.method === "POST") {
    const existingHeaders = req.headers;
    delete existingHeaders.origin;
    console.log(existingHeaders);
    request({ url: "https://hits.microsoft.com/graphql", method: "POST", json: req.body, headers: { ...existingHeaders } }, function (error, response, body) {
      if (error) {
        console.error("error", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid graphql request" }));
      }
    }).pipe(res);
  } else if (req.url === "/api/devicecode" && req.method === "GET") {
    handleDevicecode(req, res);
  } else if (req.url === "/api/token" && req.method === "POST") {
    handleToken(req, res);
  } else if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "*" });
    res.end();
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Route Not Found" }));
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
