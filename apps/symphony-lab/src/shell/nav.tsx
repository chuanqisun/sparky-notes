import { Link } from "react-router-dom";
import styled from "styled-components";
import { useAuthContext } from "../account/auth-context";
import { ConnectionSetupDialog } from "../account/connection-setup-form";
import { BasicFormButton } from "../form/form";
import { useDialog } from "../utils/use-dialog";

export function Nav() {
  const { DialogComponent, open, close } = useDialog();
  const handleConnectionsButtonClick = () => open();
  const { isConnected, signOut, signIn } = useAuthContext();

  return (
    <NavLayout>
      <h1>
        <Link to="/"> Symphony</Link>
      </h1>
      <StyledMenu>
        {isConnected === false ? <button onClick={signIn}>Sign in</button> : null}
        {isConnected === true && (
          <>
            <BasicFormButton onClick={handleConnectionsButtonClick}>Connections</BasicFormButton>
            <DialogComponent>
              <ConnectionSetupDialog onClose={close} />
            </DialogComponent>
            <BasicFormButton onClick={signOut}>Sign out</BasicFormButton>
          </>
        )}
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
