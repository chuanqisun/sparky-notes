import { styled } from "styled-components";
import { useAuthContext } from "../account/use-auth-context";

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected, signOut, signIn } = useAuthContext();

  return (
    <StyledMain>
      {isConnected === undefined ? <p>Authenticating...</p> : null}
      {isConnected === true ? props.children : null}
      {isConnected === false ? <button onClick={signIn}>Sign in</button> : null}
      {isConnected === true && <button onClick={signOut}>Sign out</button>}
    </StyledMain>
  );
};

const StyledMain = styled.main`
  color-scheme: light;
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 0;
`;
