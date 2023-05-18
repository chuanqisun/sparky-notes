import assert from "assert";
import axios from "axios";
import axiosRetry from "axios-retry";
import type { RequestHandler } from "express";

// ref: https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference
export interface CompletionInput {
  prompt: string;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  best_of: number;
  max_tokens: number;
  stop: null | string | string[];
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

export interface CompletionsConfig {
  endpoint: string;
  key: string;
}
export const completions: (config: CompletionsConfig) => RequestHandler = (config) => async (req, res, next) => {
  try {
    let input: CompletionInput = req.body;
    assert(typeof input.prompt === "string");

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
