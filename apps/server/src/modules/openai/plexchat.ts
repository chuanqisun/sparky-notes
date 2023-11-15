import assert from "node:assert";
import { plexchat, type SimpleChatProxy, type SimpleEmbedProxy } from "plexchat";
import { devChatEndpointManifest, prodChatEndpointManifest } from "../../plexchat-config";

let memoProxies: { chatProxy: SimpleChatProxy; embedProxy: SimpleEmbedProxy } | null = null;

export function loadOpenAIProxies() {
  if (memoProxies) return memoProxies;

  assert(process.env.HITS_OPENAI_DEV_API_KEY, "HITS_OPENAI_DEV_API_KEY is required");
  assert(process.env.HITS_OPENAI_DEV_ENDPOINT, "HITS_OPENAI_DEV_ENDPOINT is required");
  assert(process.env.HITS_OPENAI_PROD_API_KEY, "HITS_OPENAI_PROD_API_KEY is required");
  assert(process.env.HITS_OPENAI_PROD_ENDPOINT, "HITS_OPENAI_PROD_ENDPOINT is required");

  const { chatProxy, embedProxy } = plexchat({
    manifests: [
      devChatEndpointManifest(process.env.HITS_OPENAI_DEV_ENDPOINT, process.env.HITS_OPENAI_DEV_API_KEY),
      prodChatEndpointManifest(process.env.HITS_OPENAI_PROD_ENDPOINT, process.env.HITS_OPENAI_PROD_API_KEY),
    ],
    logLevel: 1, // WARN. todo expose as enum
  });

  memoProxies = { chatProxy, embedProxy };
  return memoProxies;
}
