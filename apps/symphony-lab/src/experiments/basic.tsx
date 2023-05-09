import type React from "react";
import { ChatTree } from "../chat-tree/chat-tree";
import { CenterClamp } from "../shell/center-clamp";

export const Basic: React.FC = () => {
  return (
    <CenterClamp>
      <ChatTree />
    </CenterClamp>
  );
};
