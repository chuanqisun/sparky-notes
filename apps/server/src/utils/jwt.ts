export function parseJwtHeader(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[0], "base64").toString());
}

export function parseJwtBody(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
}
