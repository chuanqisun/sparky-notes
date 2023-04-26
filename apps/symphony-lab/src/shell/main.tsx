import { styled } from "styled-components";
import { useAuth } from "../account/use-auth";

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected } = useAuth();

  return (
    <StyledMain>
      {isConnected === undefined ? <p>Authenticating...</p> : null}
      {isConnected === true ? props.children : null}
    </StyledMain>
  );
};

const StyledMain = styled.main`
  color-scheme: light;
`;
