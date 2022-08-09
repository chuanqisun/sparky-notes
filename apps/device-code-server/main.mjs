import http from "http";
import { handleDevicecode, handleToken } from "./controllers/auth.mjs";
import { handleGraphql } from "./controllers/graphql.mjs";

const server = http.createServer((req, res) => {
  if (req.url === "/api/graphql" && req.method === "POST") {
    handleGraphql(req, res);
  } else if (req.url === "/api/devicecode" && req.method === "GET") {
    handleDevicecode(req, res);
  } else if (req.url === "/api/token" && req.method === "POST") {
    handleToken(req, res);
  } else if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Request-Method": "*", "Access-Control-Allow-Headers": "*" });
    res.end();
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Route Not Found" }));
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
