import { proxyToFigma } from "@h20/figma-relay";
import { MessageToFigma, MessageToWeb } from "@impromptu/types";
import { useMemo } from "react";
import { styled } from "styled-components";
import { useAuthContext } from "../account/use-auth-context";

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected, signOut, signIn } = useAuthContext();
  const proxy = useMemo(() => proxyToFigma<MessageToFigma, MessageToWeb>(import.meta.env.VITE_PLUGIN_ID), []);

  return (
    <StyledMain>
      {isConnected ? (
        <fieldset>
          <legend>Builder</legend>
          <button onClick={() => proxy.notify({ createStep: {} })}>Create step</button>
        </fieldset>
      ) : null}
      <fieldset>
        <legend>Account</legend>
        {isConnected === undefined ? <p>Authenticating...</p> : null}
        {isConnected === true ? props.children : null}
        {isConnected === false ? <button onClick={signIn}>Sign in</button> : null}
        {isConnected === true && <button onClick={signOut}>Sign out</button>}
      </fieldset>
    </StyledMain>
  );
};

const StyledMain = styled.main``;
