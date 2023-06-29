import type { ChatProxy } from "../../account/model-selector";
import type { ChatMessage } from "../../openai/chat";
import type { ShelfDirective } from "./base-directive";

export function createAntidoteDirective(chat: ChatProxy): ShelfDirective {
  return {
    match: (source) => source.startsWith("/antidote"),
    run: async ({ data, updateStatus: setStatus, source }) => {
      if (!Array.isArray(data)) {
        return {
          status: "The shelf must be a list of texts. Hint: /code can help transform it into a list of texts",
        };
      }

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
            return prefix + `${line.author}: ${line.content}`;
          })
          .join("\n");
      });

      const tagRequestMessages: ChatMessage[][] = contextBlurbs.map((contextBlurb) => [
        {
          role: "system",
          content: `In the chatroom, people are proposing codenames for a new Azure product. Extract the list of codenames from the line marked by "=>". Respond in this format

"""
focus line: <repeat the line marked by the arrow>
codenames: <comma separated names or N/A>
"""
        `,
        },
        { role: "user", content: contextBlurb },
      ]);

      let progress = 0;

      const tagsResult: any[] = [];

      for (const messages of tagRequestMessages) {
        await chat(messages, { max_tokens: 1200, temperature: 0 })
          .then((response) => {
            progress++;
            const tags =
              response
                .split("\n")
                .find((line) => line.startsWith("codenames:"))
                ?.slice("codenames:".length)
                .trim()
                .split(",")
                .map((tag) => tag.trim()) ?? [];
            setStatus(`Progress: ${progress}/${tagRequestMessages.length}, ${tags.join(", ")}`);

            tagsResult.push(tags);
            return tags;
          })
          .catch((error) => {
            progress++;
            setStatus(`Progress: ${progress}/${tagRequestMessages.length}, ${error}`);
            return [];
          });
      }

      // const tagsResult = await Promise.all(
      //   tagRequestMessages.map((messages) =>
      //     chat(messages, { max_tokens: 1200, temperature: 0 })
      //       .then((response) => {
      //         progress++;
      //         const tags =
      //           response
      //             .split("\n")
      //             .find((line) => line.startsWith("codenames:"))
      //             ?.slice("codenames:".length)
      //             .trim()
      //             .split(",")
      //             .map((tag) => tag.trim()) ?? [];
      //         setStatus(`Progress: ${progress}/${tagRequestMessages.length}, ${tags.join(", ")}`);

      //         return tags;
      //       })
      //       .catch((error) => {
      //         progress++;
      //         setStatus(`Progress: ${progress}/${tagRequestMessages.length}, ${error}`);
      //         return [];
      //       })
      //   )
      // );

      const taggedShelf = data.map((line, index) => {
        const tags = tagsResult[index];
        return { line, names: tags };
      });

      return {
        status: `Tags added to "names" field`,
        data: taggedShelf,
      };
    },
  };
}
