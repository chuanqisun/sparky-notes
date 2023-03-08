export function parseJwtHeader(token: string) {
  return JSON.parse(window.atob(token.split(".")[0]).toString());
}

export function parseJwtBody(token: string) {
  return JSON.parse(window.atob(token.split(".")[1]).toString());
}
