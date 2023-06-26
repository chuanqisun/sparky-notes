import type { CozoDb } from "cozo-lib-wasm";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { rateLimitQueue, withAsyncQueue } from "../http/rate-limit";
import { jqAutoPrompt } from "../jq/jq-auto-prompt";
import { jsAutoPromptV2 } from "../jq/js-auto-prompt-v2";
import type { ChatMessage } from "../openai/chat";
import { CenterClamp } from "../shell/center-clamp";

export interface BasicShelfProps {
  db: CozoDb;
}

interface AppState {
  currentShelfIndex: number;
  shelves: Shelf[];
}

interface Shelf {
  source: string;
  data: any[];
}

export const BasicShelf: React.FC<BasicShelfProps> = ({ db }) => {
  const graph = useRef(new Cozo(db));
  useEffect(() => {
    console.log(graph);
  }, [graph]);

  const { chat, ModelSelectorElement } = useModelSelector();

  const rateLimitedChat = useMemo(() => {
    const queue = rateLimitQueue(300, 0.1);
    const rateLimitedProxy = withAsyncQueue(queue, chat);
    return rateLimitedProxy;
  }, [chat]);

  const [shelfState, setShelfState] = useState<AppState>({
    currentShelfIndex: 0,
    shelves: [
      {
        source: "",
        data: [],
      },
    ],
  });

  const updateCurrentShelf = (updateFn: (shelf: Shelf) => Shelf) => {
    setShelfState((shelfState) => {
      const remainingShelves = shelfState.shelves.slice(0, shelfState.currentShelfIndex + 1);
      const currentShelf = remainingShelves[shelfState.currentShelfIndex];
      const newShelf = updateFn(currentShelf);
      remainingShelves[shelfState.currentShelfIndex] = newShelf;
      return { ...shelfState, shelves: remainingShelves };
    });
  };

  const addShelf = (shelf: Shelf) => {
    setShelfState((shelfState) => {
      const newShelfList = [...shelfState.shelves, shelf];
      const newIndex = shelfState.currentShelfIndex + 1;
      return { currentShelfIndex: newIndex, shelves: newShelfList };
    });
  };

  const openShelf = (index: number) => {
    setShelfState((shelfState) => {
      if (index < 0 || index >= shelfState.shelves.length) {
        return shelfState;
      }
      return { ...shelfState, currentShelfIndex: index };
    });
  };

  const shelf = shelfState.shelves[shelfState.currentShelfIndex];
  const userMessage = shelf.source;

  const updateUserMessage = (userMessage: string) => {
    updateCurrentShelf((shelf) => ({ ...shelf, source: userMessage }));
  };

  const updateShelfData = (data: any[]) => {
    updateCurrentShelf((shelf) => ({ ...shelf, data }));
  };

  const [status, setStatus] = useState("");

  const handleSubmit = async () => {
    addShelf({ source: "", data: [] });
    if (userMessage.startsWith("/json")) {
      const [fileHandle] = (await (window as any).showOpenFilePicker()) as FileSystemFileHandle[];
      const file = await fileHandle.getFile();
      const jsonText = await file.text();
      setStatus("Imported JSON file");
      try {
        updateShelfData(JSON.parse(jsonText));
      } catch {}
    } else if (userMessage.startsWith("/export")) {
      const fileHandle = (await (window as any).showSaveFilePicker()) as FileSystemFileHandle;
      const file = await fileHandle.createWritable();
      await file.write(JSON.stringify(shelf));
      await file.close();
      setStatus("Exported JSON file");
    } else if (userMessage.startsWith("/code")) {
      const codePlan = userMessage.slice("/code".length).trim();
      const output = await jsAutoPromptV2({
        input: shelf,
        onGetChat: (messages: ChatMessage[]) => rateLimitedChat(messages, { max_tokens: 1200, temperature: 0 }),
        onGetUserMessage: ({ lastError }) =>
          lastError ? `The previous function call failed with error: ${lastError}. Try a different query` : `Goal: ${codePlan}`,
      });

      updateShelfData(output);
    } else if (userMessage.startsWith("/jq")) {
      const jqPlan = userMessage.slice("/jq".length).trim();
      const output = await jqAutoPrompt({
        input: shelf,
        onGetChat: (messages: ChatMessage[]) => rateLimitedChat(messages, { max_tokens: 1200, temperature: 0 }),
        onGetUserMessage: ({ lastError }) => (lastError ? `The previous query failed with error: ${lastError}. Try a different query` : jqPlan),
        onJqString: (jq) => setStatus(`jq: ${jq}`),
        onRetry: (error) => setStatus(`retry due to ${error}`),
      });

      updateShelfData(output);
    } else if (userMessage.startsWith("/tag")) {
      if (!Array.isArray(shelf)) {
        setStatus("The shelf must be a list of texts. Hint: /code can help transform it into a list of texts");
        return;
      }

      const tagPlan = userMessage.slice("/tag".length).trim();

      const slidingWindows: { startIndex: number; endIndex: number; focusIndex: number }[] = ((totalLength: number, radius: number) => {
        const results: { startIndex: number; endIndex: number; focusIndex: number }[] = [];
        for (let focusIndex = 0; focusIndex < totalLength; focusIndex++) {
          const startIndex = Math.max(0, focusIndex - radius);
          const endIndex = Math.min(totalLength, focusIndex + radius + 1);
          results.push({ startIndex, endIndex, focusIndex });
        }
        return results;
      })(shelf.length, 3);

      const contextBlurbs: string[] = slidingWindows.map(({ startIndex, endIndex, focusIndex }) => {
        const lines = shelf.slice(startIndex, endIndex);
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
          rateLimitedChat(messages, { max_tokens: 1200, temperature: 0 })
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

      const tagFieldNameResponse = await rateLimitedChat(tagsFieldNameMessage, { max_tokens: 200, temperature: 0 });
      const tagFieldName = tagFieldNameResponse.match(/VariableName: (.*)/)?.[1].trim() ?? "tags";

      const taggedShelf = shelf.map((line, index) => {
        const tags = tagsResult[index];
        return { line, [tagFieldName]: tags };
      });

      setStatus(`Tags added to "${tagFieldName}" field`);
      updateShelfData(taggedShelf);
    }
  };

  return (
    <AppLayout>
      <header>{ModelSelectorElement}</header>
      <StyledOutput>
        <JSONTree theme={theme} hideRoot={true} data={shelf.data} />
      </StyledOutput>
      <div>
        {shelfState.shelves.map((_, index) => (
          <button key={index} onClick={() => openShelf(index)}>
            {index === shelfState.currentShelfIndex ? "*" : ""}
            {index}
          </button>
        ))}
      </div>
      <ChatWidget>
        <div>
          <AutoResize data-resize-textarea-content={userMessage}>
            <textarea
              value={userMessage}
              onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit() : null)}
              onChange={(e) => updateUserMessage(e.target.value)}
            />
          </AutoResize>
          <output>{status}</output>
        </div>
        <button onClick={handleSubmit}>Submit (Ctrl + Enter)</button>
      </ChatWidget>
    </AppLayout>
  );
};

const AppLayout = styled(CenterClamp)`
  display: grid;
  width: 100%;
  min-height: 0;
  align-content: start;
  grid-template-rows: auto 1fr auto;
`;

const ChatWidget = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
`;

export const theme = {
  scheme: "monokai",
  author: "wimer hazenberg (http://www.monokai.nl)",
  base00: "#272822",
  base01: "#383830",
  base02: "#49483e",
  base03: "#75715e",
  base04: "#a59f85",
  base05: "#f8f8f2",
  base06: "#f5f4f1",
  base07: "#f9f8f5",
  base08: "#f92672",
  base09: "#fd971f",
  base0A: "#f4bf75",
  base0B: "#a6e22e",
  base0C: "#a1efe4",
  base0D: "#66d9ef",
  base0E: "#ae81ff",
  base0F: "#cc6633",
};

export const StyledOutput = styled.div`
  width: 100%;
  overflow-y: scroll;
  color-scheme: dark;
  padding: 0 4px;
  background-color: ${theme.base00};

  & > ul {
    margin: 0 !important;
    height: 100%;
  }
`;
