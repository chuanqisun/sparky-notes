import assert from "assert";
import axios from "axios";
import axiosRetry from "axios-retry";
import type { RequestHandler } from "express";

// ref: https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference#embeddings
export interface EmbeddingInput {
  input: string;
}

export interface EmbeddingOutput {
  object: "string";
  model: "string";
  data: [
    {
      index: number;
      object: "embedding";
      embedding: number[];
    }
  ];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const axiosInstance = axios.create();
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (count) => {
    console.log(`openai completion retry: ${count}`);
    return count * 2000;
  },
  retryCondition: (error) => error.response?.status === 429,
});

export interface EmbeddingConfig {
  endpoint: string;
  key: string;
}
export const embedding: (config: EmbeddingConfig) => RequestHandler = (config) => async (req, res, next) => {
  try {
    let input: EmbeddingInput = req.body;
    assert(typeof input === "string", "input must be string");

    const response = await axiosInstance({
      // TODO replace with env
      url: config.endpoint,
      method: "post",
      data: input,
      headers: {
        "api-key": config.key,
        "Content-Type": "application/json",
      },
    });

    res.status(response.status).json(response.data);

    next();
  } catch (e) {
    next(e);
  }
};
