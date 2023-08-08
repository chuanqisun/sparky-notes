import styled from "styled-components";
import { theme } from "./theme";

export const StyledOutput = styled.div`
  width: 100%;
  background-color: ${theme.base00};
  max-height: 400px;
  overflow-y: auto;
  color-scheme: dark;

  & > ul {
    margin: 0 4px !important;
  }
`;
