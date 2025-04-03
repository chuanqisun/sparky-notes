import type { ChatOutput } from "@h20/server";

export function ensureJsonResponse<T>(formatResponse: (parsed: any) => T, response: ChatOutput) {
  if (response.choices[0]?.finish_reason !== "stop" || !response.choices[0]?.message.content) throw new Error("Incomplete response");

  const parsedResponse = JSON.parse(response.choices[0].message.content);
  return formatResponse(parsedResponse);
}
