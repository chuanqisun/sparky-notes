export interface FilterResult<T> {
  accepted: T[];
  rejected: T[];
  errors: { item: T; error: any }[];
}

export const defaultCriteria = `Accept items that have a possitive meaning, reject the neutral or negative ones`;

export interface FilterOptions<T> {
  predicate: string;
  getItemText: (item: T) => string;
  items: T[];
  onAccept?: (item: T) => void;
  onReject?: (item: T) => void;
  onError?: (item: T, error: any) => void;
  abortSignal?: AbortSignal;
}
export async function filter<T>({ predicate, getItemText, items, onAccept, onReject, onError, abortSignal }: FilterOptions<T>): Promise<FilterResult<T>> {
  const results = {
    accepted: [] as T[],
    rejected: [] as T[],
    errors: [] as { item: T; error: any }[],
  };

  try {
    //     await Promise.all(
    //       items.map((item) =>
    //         chatProxy(
    //           {
    //             response_format: {
    //               type: "json_object",
    //             },
    //             max_tokens: 100,
    //             messages: [
    //               {
    //                 role: "system",
    //                 content: `
    // Binary classify text based on the goal: "${predicate?.trim().length ? predicate : defaultCriteria}".
    // First reason about whether the text meets the criteria implied by the goal. If so, respond "keep". Otherwise, respond "reject".
    // Respond in JSON format like this:
    // """
    // {
    //   "reason": "<one sentence reason on whether the text meets to the criteria>",
    //   "decision": <"keep" | "reject">
    // }
    // """
    //                 `.trim(),
    //               },
    //               {
    //                 role: "user",
    //                 content: getItemText(item),
    //               },
    //             ],
    //           },
    //           {
    //             models: ["gpt-4o"],
    //           },
    //           {
    //             signal: abortSignal,
    //           }
    //         )
    //           .then(async (result) => {
    //             const conclusion = await ensureJsonResponse((rawResponse) => {
    //               if (typeof rawResponse.decision !== "string") {
    //                 throw new Error(`Expected boolean, got ${typeof rawResponse.isTrue}`);
    //               }
    //               return (rawResponse.decision as string).toLocaleLowerCase() === "keep";
    //             }, result);
    //             if (conclusion) {
    //               onAccept?.(item);
    //               results.accepted.push(item);
    //             } else {
    //               onReject?.(item);
    //               results.rejected.push(item);
    //             }
    //             return conclusion;
    //           })
    //           .catch((e) => {
    //             // do not handle abort error
    //             if ((e as Error)?.name === "AbortError") throw e;
    //             console.error(e);
    //             onError?.(item, e);
    //             results.errors.push({ item, error: e });
    //             return true; // conservative
    //           })
    //       )
    //     );
    //     return results;
    return {
      accepted: items,
      rejected: [],
      errors: [],
    } as FilterResult<T>;
  } catch (e) {
    console.error(e);

    return {
      accepted: [] as T[],
      rejected: [] as T[],
      errors: items.map((item) => ({ item, error: e })),
    };
  }
}
