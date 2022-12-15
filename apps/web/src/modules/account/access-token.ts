export const TOKEN_CACHE_KEY = "access-token";

export interface AccessToken {
  token: string;
  expireIn: number;
  expireAt: number;
}

export function getInitialToken(): AccessToken {
  return { token: "", expireIn: 0, expireAt: 0 };
}

export function validateToken(maybeToken: any): maybeToken is AccessToken {
  return (
    typeof maybeToken === "object" && typeof maybeToken.token === "string" && typeof maybeToken.expireIn === "number" && typeof maybeToken.expireAt === "number"
  );
}
