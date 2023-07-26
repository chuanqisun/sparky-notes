import type React from "react";
import { useState } from "react";
import { JSONTree } from "react-json-tree";
import styled from "styled-components";
import { AutoResize } from "../form/auto-resize";
import { useMotifShelfManager } from "../motif-shelf/use-motif-shelf-manager";
import { StyledOutput, theme } from "../shelf/json-view";
import { CenterClamp } from "../shell/center-clamp";

export interface MotifShelfProps {}

export const MotifShelf: React.FC<MotifShelfProps> = () => {
  const { userMessage, updateUserMessage, shelves, openShelf, currentShelf } = useMotifShelfManager();
  const [status, setStatus] = useState("Ready");
  const handleSubmit = () => {};
  const handleAbort = () => {};

  return (
    <AppLayout>
      <ChatWidget>
        <div>
          <AutoResize data-resize-textarea-content={userMessage}>
            <textarea
              value={userMessage}
              onKeyDown={(e) => (e.ctrlKey && e.key === "Enter" ? handleSubmit() : null)}
              onChange={(e) => updateUserMessage(e.target.value)}
            />
          </AutoResize>
        </div>
      </ChatWidget>
      <div>
        {shelves.map((shelf, index) => (
          <button key={index} onClick={() => openShelf(index)}>
            {shelf === currentShelf ? "*" : ""}
            {index}
          </button>
        ))}
      </div>
      <StatusDisplay>{status}</StatusDisplay>
      <StyledOutput>
        <JSONTree theme={theme} hideRoot={true} data={currentShelf.data} />
      </StyledOutput>
    </AppLayout>
  );
};

const StatusDisplay = styled.output`
  display: block;
  background-color: ${theme.base00};
  padding-left: 0.5rem;
  color: ${theme.base09};
  border-bottom: 1px solid ${theme.base03};
`;

const AppLayout = styled(CenterClamp)`
  display: grid;
  width: 100%;
  min-height: 0;
  align-content: start;
  grid-template-rows: auto auto auto 1fr;
`;

const ChatWidget = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
`;
