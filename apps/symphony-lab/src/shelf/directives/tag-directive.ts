import type { ChatProxy } from "../../account/model-selector";
import type { ChatMessage } from "../../openai/chat";
import type { ShelfDirective } from "./base-directive";

export function createTagDirective(chat: ChatProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/tag"),
    run: async ({ data, updateStatus: setStatus, source }) => {
      if (!Array.isArray(data)) {
        return {
          status: "The shelf must be a list of texts. Hint: /code can help transform it into a list of texts",
        };
      }

      const tagPlan = source.slice("/tag".length).trim();

      const slidingWindows: { startIndex: number; endIndex: number; focusIndex: number }[] = ((totalLength: number, radius: number) => {
        const results: { startIndex: number; endIndex: number; focusIndex: number }[] = [];
        for (let focusIndex = 0; focusIndex < totalLength; focusIndex++) {
          const startIndex = Math.max(0, focusIndex - radius);
          const endIndex = Math.min(totalLength, focusIndex + radius + 1);
          results.push({ startIndex, endIndex, focusIndex });
        }
        return results;
      })(data.length, 3);

      const contextBlurbs: string[] = slidingWindows.map(({ startIndex, endIndex, focusIndex }) => {
        const lines = data.slice(startIndex, endIndex);
        const relativeFocusIndex = focusIndex - startIndex;

        return lines
          .map((line, index) => {
            const prefix = index === relativeFocusIndex ? "=>" : "  ";
            return prefix + line;
          })
          .join("\n");
      });

      const tagRequestMessages: ChatMessage[][] = contextBlurbs.map((contextBlurb) => [
        {
          role: "system",
          content: `Read the entire snippet and tag the line marked with  "=>". Make sure the tags represent "${tagPlan}"
Respond in the format delimited by triple quotes:

"""
focus line: <repeat the line marked by the arrow>
tags: <comma separated tags>
"""
        `,
        },
        { role: "user", content: contextBlurb },
      ]);

      let progress = 0;

      const tagsResult = await Promise.all(
        tagRequestMessages.map((messages) =>
          chat(messages, { max_tokens: 400, temperature: 0 })
            .then((response) => {
              progress++;
              const tags =
                response
                  .split("\n")
                  .find((line) => line.startsWith("tags:"))
                  ?.slice("tags:".length)
                  .trim()
                  .split(",")
                  .map((tag) => tag.trim()) ?? [];
              setStatus(`Progress: ${progress}/${tagRequestMessages.length}, ${tags.join(", ")}`);

              return tags;
            })
            .catch((error) => {
              progress++;
              setStatus(`Progress: ${progress}/${tagRequestMessages.length}, ${error}`);
              return [];
            })
        )
      );

      const tagsFieldNameMessage: ChatMessage[] = [
        {
          role: "system",
          content: `User will provide you a list of tags that represent "${tagPlan}". Provide a lowerCamelCase variable name for the tags. Respond in the format delimited by triple quotes:
"""
Observation: <make an observation about the nature of the tags>
VariableName: <a single lowerCamelCase variable name that represents all the tags>
"""
          `,
        },
        {
          role: "user",
          content: tagsResult.flat().slice(0, 10).join(", "),
        },
      ];

      const tagFieldNameResponse = await chat(tagsFieldNameMessage, { max_tokens: 200, temperature: 0 });
      const tagFieldName = tagFieldNameResponse.match(/VariableName: (.*)/)?.[1].trim() ?? "tags";

      const taggedShelf = data.map((line, index) => {
        const tags = tagsResult[index];
        return { line, [tagFieldName]: tags };
      });

      return {
        status: `Tags added to "${tagFieldName}" field`,
        data: taggedShelf,
      };
    },
  };
}
