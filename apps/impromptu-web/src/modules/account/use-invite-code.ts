import { useEffect, useState } from "preact/hooks";

export function useInvitieCode(value?: string) {
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    getSha256(value ?? "").then((sha) => setIsValid(activeCodes.includes(sha)));
  }, [value]);

  return isValid;
}

async function getSha256(input: string) {
  const data = new TextEncoder().encode(input + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
  return hashHex;
}

export const salt = "himalayan";

export const activeCodes = [
  "f6085aeac02aeeb7dd0012f6ffa14fece7a4f6386dcaba61659f30cd208c673b", // monad
  "b92f8df1c7ed7d53a3311b68eddce3b3d8d77c7bdf1057ca5889151b1775775f", // MONAD
];
