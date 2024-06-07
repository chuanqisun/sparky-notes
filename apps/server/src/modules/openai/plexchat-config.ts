import { type PlexEndpointManifest } from "plexchat";

export function devChatEndpointManifest(endpoint: string, apiKey: string): PlexEndpointManifest {
  return {
    apiKey,
    endpoint,
    models: [
      {
        deploymentName: "gpt-4o",
        modelName: "gpt-4o",
        contextWindow: 128_000,
        rpm: 900,
        tpm: 150_000,
        apiVersion: "2024-02-15-preview",
      },
      {
        deploymentName: "gpt-4o-global",
        modelName: "gpt-4o",
        contextWindow: 128_000,
        rpm: 2_700,
        tpm: 450_000,
        apiVersion: "2024-02-15-preview",
      },
    ],
  };
}
