import styled from "styled-components";

export const BasicActionGroup = styled.div`
  display: flex;
  gap: 8px;
`;

export const DialogActionGroup = styled.div`
  display: flex;
  justify-content: end;
  gap: 8px;
`;

export const BasicForm = styled.form`
  display: grid;
  gap: 8px;
`;

export const BasicFormField = styled.div`
  display: grid;
  gap: 4px;
`;

export const BasicFormButton = styled.button`
  padding: var(--input-padding-block) var(--input-padding-inline);
`;

export const BasicFormInput = styled.input`
  padding: var(--input-padding-block) var(--input-padding-inline);
`;

export const BasicFormTextarea = styled.textarea`
  padding: var(--input-padding-block) var(--input-padding-inline);
`;

export const AutoResize = styled.div`
  display: grid;

  textarea {
    grid-area: 1 / 1 / 2 / 2;
    white-space: pre-wrap;
    overflow: hidden;
    padding: var(--input-padding-block) var(--input-padding-inline);
    border-width: var(--input-border-width);
    resize: none;
  }

  &::after {
    white-space: pre-wrap;
    grid-area: 1 / 1 / 2 / 2;
    content: attr(data-resize-textarea-content) " ";
    visibility: hidden;
    padding: var(--input-padding-block) var(--input-padding-inline);
    border-width: var(--input-border-width);
  }
`;
