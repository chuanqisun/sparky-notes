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

export const salt = "pandemic";

export const activeCodes = [
  "ebf7e1be27f89754c13c83b6b601f31d89772769076a60ae2026b5d11bc232a2", // covid
  "1e7f6b76fb63993081fc71a8dd1343bdb4b725e457b37207a20718609fbb6fe8", // COVID
];
