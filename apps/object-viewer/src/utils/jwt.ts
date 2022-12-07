export function parseJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
  } catch {
    return null;
  }
}
