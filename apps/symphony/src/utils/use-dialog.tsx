import React, { useCallback, useRef } from "react";
import styled from "styled-components";

export function useDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback(() => dialogRef.current?.showModal(), []);
  const close = useCallback(() => dialogRef.current?.close(), []);
  const DialogComponent: React.FC<{ children?: JSX.Element }> = useCallback((props) => <StyledDialog ref={dialogRef}>{props.children}</StyledDialog>, []);

  return {
    open,
    close,
    DialogComponent,
  };
}

const StyledDialog = styled.dialog`
  // adaptive width with clamp
  margin: auto;
  color-scheme: light;
  width: clamp(300px, 80vw, 600px);
`;
