import { ensureJsonResponse } from "../openai/ensure-json-response";
import type { Chat } from "../openai/proxy";

export interface FilterOptions<T> {
  onAccept?: (item: T) => void;
  onReject?: (item: T) => void;
  onError?: (item: T, error: any) => void;
}

export interface FilterResult<T> {
  accepted: T[];
  rejected: T[];
  errors: { item: T; error: any }[];
}

export const defaultCriteria = `Accept items that have a possitive meaning, reject the neutral or negative ones`;

export async function filter<T>(
  chatProxy: Chat,
  predicate: string,
  getItemText: (item: T) => string,
  items: T[],
  options?: FilterOptions<T>,
  abortHandle?: string
): Promise<FilterResult<T>> {
  const results = {
    accepted: [] as T[],
    rejected: [] as T[],
    errors: [] as { item: T; error: any }[],
  };

  try {
    await Promise.all(
      items.map((item) =>
        chatProxy({
          input: {
            response_format: {
              type: "json_object",
            },
            max_tokens: 100,
            messages: [
              {
                role: "system",
                content: `
Binary classify text based on the goal: "${predicate?.trim().length ? predicate : defaultCriteria}".

First reason about whether the text meets the criteria implied by the goal. If so, respond "keep". Otherwise, respond "reject".


Respond in JSON format like this:
"""
{
  "reason": "<one sentence reason on whether the text meets to the criteria>",
  "decision": <"keep" | "reject">
}
"""
                `.trim(),
              },
              {
                role: "user",
                content: getItemText(item),
              },
            ],
          },
          context: {
            abortHandle,
            models: ["gpt-4o"],
          },
        })
          .then(async (result) => {
            const conclusion = await ensureJsonResponse((rawResponse) => {
              if (typeof rawResponse.decision !== "string") {
                throw new Error(`Expected boolean, got ${typeof rawResponse.isTrue}`);
              }

              return (rawResponse.decision as string).toLocaleLowerCase() === "keep";
            }, result);

            if (conclusion) {
              options?.onAccept?.(item);
              results.accepted.push(item);
            } else {
              options?.onReject?.(item);
              results.rejected.push(item);
            }

            return conclusion;
          })
          .catch((e) => {
            console.error(e);
            options?.onError?.(item, e);
            results.errors.push({ item, error: e });
            return true; // conservative
          })
      )
    );

    return results;
  } catch (e) {
    console.error(e);

    return {
      accepted: [] as T[],
      rejected: [] as T[],
      errors: items.map((item) => ({ item, error: e })),
    };
  }
}
