import assert from "assert";
import axios from "axios";
import axiosRetry from "axios-retry";
import type { RequestHandler } from "express";

// ref: https://learn.microsoft.com/en-us/azure/cognitive-services/openai/reference
export interface ChatInput {
  messages: ChatMessage[];
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  stop: null | string | string[];
}

export interface ChatMessage {
  role: "assistant" | "system" | "user";
  content: string;
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

export interface ChatConfig {
  openaiChatEndpoint: string;
}
export const chat: (config: ChatConfig) => RequestHandler = (config) => async (req, res, next) => {
  try {
    let input: ChatInput = req.body;
    assert(Array.isArray(input?.messages), "messages must be an Array");

    const response = await axiosInstance({
      // TODO replace with env
      url: config.openaiChatEndpoint,
      method: "post",
      data: input,
      headers: {
        "api-key": process.env.OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
    });

    res.status(response.status).json(response.data);

    next();
  } catch (e) {
    next(e);
  }
};
