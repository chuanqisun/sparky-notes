import { type ChatEndpointManifest } from "plexchat";

export function prodChatEndpointManifest(endpoint: string, apiKey: string): ChatEndpointManifest {
  return {
    apiKey,
    endpoint,
    models: [
      {
        deploymentName: "gpt-35-turbo",
        modelName: "gpt-35-turbo",
        contextWindow: 4_096,
        rpm: 1_800,
        tpm: 300_000,
      },
      {
        deploymentName: "gpt-35-turbo-16k",
        modelName: "gpt-35-turbo-16k",
        contextWindow: 16_384,
        rpm: 1_800,
        tpm: 300_000,
      },
      {
        deploymentName: "gpt-4",
        modelName: "gpt-4",
        contextWindow: 8_192,
        rpm: 240,
        tpm: 40_000,
      },
      {
        deploymentName: "gpt-4-32k",
        modelName: "gpt-4-32k",
        contextWindow: 32_768,
        rpm: 480,
        tpm: 80_000,
      },
    ],
  };
}

export function devChatEndpointManifest(endpoint: string, apiKey: string): ChatEndpointManifest {
  return {
    apiKey,
    endpoint,
    models: [
      {
        deploymentName: "gpt-35-turbo",
        modelName: "gpt-35-turbo",
        contextWindow: 4_096,
        rpm: 1_242,
        tpm: 207_000,
      },
      {
        deploymentName: "gpt-35-turbo-16k",
        modelName: "gpt-35-turbo-16k",
        contextWindow: 16_384,
        rpm: 1_440,
        tpm: 240_000,
      },
      {
        deploymentName: "gpt-4",
        modelName: "gpt-4",
        contextWindow: 8_192,
        rpm: 60,
        tpm: 10_000,
      },
      {
        deploymentName: "gpt-4-32k",
        modelName: "gpt-4-32k",
        contextWindow: 32_768,
        rpm: 360,
        tpm: 60_000,
      },
      {
        deploymentName: "text-embedding-ada-002",
        modelName: "text-embedding-ada-002",
        contextWindow: 2_048,
        rpm: 720,
        tpm: 120_000,
      },
    ],
  };
}
