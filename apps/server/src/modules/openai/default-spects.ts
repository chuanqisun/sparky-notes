import type { PlexChatEndpoint } from "./plex-chat";

export type Specs = Omit<PlexChatEndpoint, "endpoint" | "key">;
export function getGpt35ProdSpecs(override?: Partial<PlexChatEndpoint>): Specs {
  return {
    models: ["gpt-3.5-turbo-textonly"],
    rpm: 720,
    tpm: 120_000,
    minTimeoutMs: 3_000,
    timeoutMsPerToken: 25,
    concurrency: 10,
    contextWindow: 8_192,
    fnCall: false,
    ...override,
  };
}

export function getGpt35DevSpecs(override?: Partial<PlexChatEndpoint>): Specs {
  return {
    models: ["gpt-3.5-turbo", "gpt-3.5-turbo-textonly"],
    rpm: 720,
    tpm: 120_000,
    minTimeoutMs: 3_000,
    timeoutMsPerToken: 25,
    concurrency: 10,
    contextWindow: 4_096,
    fnCall: true,
    ...override,
  };
}

export function getGpt35Dev16kSpecs(override?: Partial<PlexChatEndpoint>): Specs {
  return {
    models: ["gpt-3.5-turbo-16k"],
    rpm: 522,
    tpm: 87_000,
    minTimeoutMs: 3_000,
    timeoutMsPerToken: 25,
    concurrency: 10,
    contextWindow: 16_384,
    fnCall: true,
    ...override,
  };
}

export function getGpt4Dev8kSpecs(override?: Partial<PlexChatEndpoint>): Specs {
  return {
    models: ["gpt-4"],
    rpm: 60,
    tpm: 10_000,
    minTimeoutMs: 5_000,
    timeoutMsPerToken: 30,
    concurrency: 10,
    contextWindow: 8_192,
    fnCall: true,
    ...override,
  };
}

export function getGpt4Dev32kSpecs(override?: Partial<PlexChatEndpoint>): Specs {
  return {
    models: ["gpt-4-32k"],
    rpm: 180,
    tpm: 30_000,
    minTimeoutMs: 5_000,
    timeoutMsPerToken: 30,
    concurrency: 10,
    contextWindow: 32_768,
    fnCall: true,
    ...override,
  };
}
