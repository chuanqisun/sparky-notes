import styled from "styled-components";
import { useAuthContext } from "../account/use-auth-context";

export function Nav() {
  const { isConnected, signOut, signIn } = useAuthContext();

  return (
    <NavLayout>
      <StyledMenu>
        {isConnected === false ? <button onClick={signIn}>Sign in</button> : null}
        {isConnected === true && <button onClick={signOut}>Sign out</button>}
      </StyledMenu>
    </NavLayout>
  );
}

const NavLayout = styled.nav`
  color-scheme: dark;
  position: sticky;
  top: 0%;
  height: 36px;
  display: flex;
  gap: 8px;
  padding: 0 8px;
  justify-content: space-between;
  align-items: center;
  background: #333;
  color: white;
`;

const StyledMenu = styled.menu`
  display: flex;
  padding: 0;
  gap: 4px;
`;
