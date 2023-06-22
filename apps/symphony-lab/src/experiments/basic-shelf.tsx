import type { CozoDb } from "cozo-lib-wasm";
import type React from "react";
import { useRef, useState } from "react";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { CenterClamp } from "../shell/center-clamp";

export interface BasicShelfProps {
  db: CozoDb;
}

export const BasicShelf: React.FC<BasicShelfProps> = ({ db }) => {
  const graph = useRef(new Cozo(db));

  const { chat, ModelSelectorElement, embed } = useModelSelector();

  const [shelfItems, setShelfItems] = useState<any[]>([]);
  const addItem = () => setShelfItems([...shelfItems, {}]);
  const [userMessage, setUserMessage] = useState("");

  return (
    <AppLayout>
      <header>{ModelSelectorElement}</header>
      {shelfItems.map((item, index) => (
        <div key={index}>{JSON.stringify(item)}</div>
      ))}
      <button onClick={addItem}>Add item</button>

      <ChatWidget>
        <AutoResize data-resize-textarea-content={userMessage}>
          <textarea value={userMessage} onChange={(e) => setUserMessage(e.target.value)} />
        </AutoResize>
        <button>Submit</button>
      </ChatWidget>
    </AppLayout>
  );
};

const AppLayout = styled(CenterClamp)`
  display: grid;
  gap: 2rem;
  width: 100%;
  align-content: start;
`;

const ChatWidget = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
`;
