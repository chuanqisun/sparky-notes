import type { CozoDb } from "cozo-lib-wasm";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { rateLimitQueue, withAsyncQueue } from "../http/rate-limit";
import { createCodeDirective } from "../shelf/directives/code-directive";
import { createExportDirective } from "../shelf/directives/export-directive";
import { createJqDirective } from "../shelf/directives/jq-directive";
import { createJsonDirective } from "../shelf/directives/json-directive";
import { createTagDirective } from "../shelf/directives/tag-directive";
import { StyledOutput, theme } from "../shelf/json-view";
import { useShelfManager } from "../shelf/use-shelf-manager";
import { CenterClamp } from "../shell/center-clamp";

export interface BasicShelfProps {
  db: CozoDb;
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

  const { addShelf, openShelf, currentShelf, shelves, userMessage, updateShelfData, updateUserMessage } = useShelfManager();
  const [status, setStatus] = useState("");

  const codeDirective = useMemo(() => createCodeDirective(rateLimitedChat), [rateLimitedChat]);
  const exportDirective = useMemo(() => createExportDirective(), []);
  const jqDirective = useMemo(() => createJqDirective(rateLimitedChat), [rateLimitedChat]);
  const jsonDirective = useMemo(() => createJsonDirective(), []);
  const tagDirective = useMemo(() => createTagDirective(rateLimitedChat), [rateLimitedChat]);

  const allDirective = [codeDirective, exportDirective, jqDirective, jsonDirective, tagDirective];

  const handleSubmit = useCallback(async () => {
    setStatus("Running...");

    const matchedDirective = allDirective.find((directive) => directive.match(userMessage));
    if (!matchedDirective) {
      setStatus("No directive matched");
      return;
    }

    addShelf({ source: "", data: [] });

    const { data, status } = await matchedDirective.run({
      source: userMessage,
      data: currentShelf.data,
      updateStatus: setStatus,
      updateData: updateShelfData,
    });

    if (data !== undefined) {
      updateShelfData(data);
    }

    setStatus(status ?? "Success");
  }, [...allDirective, setStatus, updateShelfData]);

  return (
    <AppLayout>
      <header>{ModelSelectorElement}</header>
      <StyledOutput>
        <JSONTree theme={theme} hideRoot={true} data={currentShelf.data} />
      </StyledOutput>
      <div>
        {shelves.map((shelf, index) => (
          <button key={index} onClick={() => openShelf(index)}>
            {shelf === currentShelf ? "*" : ""}
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
