import styled from "styled-components";
import { ConnectionSetupDialog } from "../account/connection-setup-form";
import { useAuth } from "../account/use-auth";
import { useDialog } from "../utils/use-dialog";

export function Nav() {
  const { DialogComponent, open, close } = useDialog();
  const handleConnectionsButtonClick = () => open();
  const { isConnected, signOut, signIn } = useAuth();

  return (
    <NavLayout>
      <h1>Symphony</h1>
      <StyledMenu>
        {isConnected === false ? <button onClick={signIn}>Sign in</button> : null}
        {isConnected === true && (
          <>
            <button onClick={handleConnectionsButtonClick}>Connections</button>
            <DialogComponent>
              <ConnectionSetupDialog onClose={close} />
            </DialogComponent>
            <button onClick={signOut}>Sign out</button>
          </>
        )}
      </StyledMenu>
    </NavLayout>
  );
}

const NavLayout = styled.nav`
  position: sticky;
  top: 0%;
  height: 36px;
  display: flex;
  gap: 16px;
  padding: 0 8px;
  justify-content: space-between;
  align-items: center;
  background: #333;
  color: white;
`;

const StyledMenu = styled.menu`
  display: flex;
  gap: 4px;
`;
