import type React from "react";
import { ChatTree } from "../chat-tree/chat-tree";
import { BasicForm, BasicFormField } from "../form/basic-form";
import { CenterClamp } from "../shell/center-clamp";
import { preventDefault } from "../utils/event";

export const Basic: React.FC = () => {
  return (
    <CenterClamp>
      <BasicForm onSubmit={preventDefault}>
        <BasicFormField></BasicFormField>
      </BasicForm>
      <ChatTree />
    </CenterClamp>
  );
};
