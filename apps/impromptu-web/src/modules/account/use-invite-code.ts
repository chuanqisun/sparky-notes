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
  "e328433c66f353086afb9658a350e7e001f2f0863db31045d19a80f195389a60", // covid
  "f18a36000e49529a3e836da0b593d9ce2e3b8b8e0b15c24d42006e9cdc6fc70c", // COVID
];
