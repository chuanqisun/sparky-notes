import styled from "styled-components";
import { AutoResize } from "../../../form/auto-resize";

export const InputField = styled.input`
  width: 100%;
  padding: 4px;
`;

export const TextAreaWrapper = styled(AutoResize)`
  --input-padding-block: 4px;
  --input-padding-inline: 4px;
`;

export const TextArea = styled.textarea`
  width: 100%;
  padding: 4px;
  resize: vertical;
  max-height: 400px;
  overflow-y: auto;
`;
