import { styled } from "styled-components";
import { useAuthContext } from "../account/use-auth-context";

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected } = useAuthContext();

  return (
    <StyledMain>
      {isConnected === undefined ? <p>Authenticating...</p> : null}
      {isConnected === true ? props.children : null}
    </StyledMain>
  );
};

const StyledMain = styled.main`
  color-scheme: light;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 0;
`;
