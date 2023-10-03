import type { FnCallProxy } from "../openai/proxy";

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
  fnCallProxy: FnCallProxy,
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
        fnCallProxy(
          [
            {
              role: "system",
              content: `Check the provided data against this condition: "${predicate}". Respond true/false`,
            },
            {
              role: "user",
              content: getItemText(item),
            },
          ],
          {
            max_tokens: 100,
            function_call: { name: "respond_true_false" },
            functions: [
              {
                name: "respond_true_false",
                description: "",
                parameters: {
                  type: "object",
                  properties: {
                    isTrue: {
                      type: "boolean",
                      description: `${predicate}`,
                    },
                  },
                  required: ["isTrue"],
                },
              },
            ],
          }
        )
          .then((result) => {
            const parsedArgs = JSON.parse(result.arguments);
            const conclusion = parsedArgs.isTrue as boolean;
            if (typeof conclusion !== "boolean") {
              throw new Error(`Expected boolean, got ${typeof conclusion}`);
            }

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
