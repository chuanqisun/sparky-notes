import { ensureJsonResponse } from "../openai/ensure-json-response";
import type { PlexChatProxy } from "../openai/proxy";

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
export async function filter<T>(
  chatProxy: PlexChatProxy,
  predicate: string,
  getItemText: (item: T) => string,
  items: T[],
  options?: FilterOptions<T>
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
Check the provided data against this condition: "${predicate}". Respond in JSON format like this:
"""
{"isTrue": <boolean>}
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
            models: ["gpt-4o"],
          },
        })
          .then(async (result) => {
            const conclusion = await ensureJsonResponse((rawResponse) => {
              if (typeof rawResponse.isTrue !== "boolean") {
                throw new Error(`Expected boolean, got ${typeof rawResponse.isTrue}`);
              }

              return rawResponse.isTrue as boolean;
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
