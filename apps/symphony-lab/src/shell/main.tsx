import { useAuth } from "../account/use-auth";

export const Main: React.FC<{ children?: React.ReactNode }> = (props) => {
  const { isConnected } = useAuth();

  return (
    <>
      {isConnected === undefined ? <p>Authenticating...</p> : null}
      {isConnected === true ? props.children : null}
    </>
  );
};
