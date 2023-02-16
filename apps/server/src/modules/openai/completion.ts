import axios from "axios";
import { assert } from "console";
import { RequestHandler } from "express";

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

export const completions: RequestHandler = async (req, res, next) => {
  try {
    let input: CompletionInput = req.body;
    assert(typeof input.prompt === "string");

    const response = await axios({
      // TODO replace with env
      url: "https://hits-openai.openai.azure.com/openai/deployments/hits-text-davinci/completions?api-version=2022-12-01",
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
