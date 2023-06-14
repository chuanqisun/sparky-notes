import styled from "styled-components";

export const AutoResize = styled.div<{ maxheight?: number }>`
  display: grid;

  textarea {
    grid-area: 1 / 1 / 2 / 2;
    white-space: pre-wrap;
    padding: var(--input-padding-block) var(--input-padding-inline);
    border-width: var(--input-border-width);
    resize: none;
    max-height: ${(props) => props.maxheight}px;
    overflow-y: ${(props) => (props.maxheight ? "auto" : "hidden")};
  }

  &::after {
    white-space: pre-wrap;
    grid-area: 1 / 1 / 2 / 2;
    content: attr(data-resize-textarea-content) " ";
    visibility: hidden;
    padding: var(--input-padding-block) var(--input-padding-inline);
    border-width: var(--input-border-width);
    border-style: solid;
    border-color: transparent;
    max-height: ${(props) => props.maxheight}px;
    overflow-y: ${(props) => (props.maxheight ? "auto" : "hidden")};
  }
`;
