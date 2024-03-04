export interface AADJwt {
  upn: string;
  exp: number;
}

// ref: https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
// caveat: won't work with special characters in the token
export function parseJwt(token: string) {
  try {
    return JSON.parse(atob(token.split(".")[1])) as AADJwt;
  } catch {
    return null;
  }
}
