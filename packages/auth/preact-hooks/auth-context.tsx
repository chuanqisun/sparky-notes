import { createContext } from "preact";
import { useAuth } from "./use-auth";

export interface AuthContextType {
  accessToken: string;
  isTokenExpired: boolean;
  isConnected?: boolean;
  signIn: () => void;
  signOut: () => void;
}

const defaultContext: AuthContextType = {
  accessToken: "",
  isTokenExpired: false,
  signIn: () => {},
  signOut: () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultContext);

export interface AuthContextProviderProps {
  serverHost: string;
  webHost: string;
  children?: any[];
}
export const AuthContextProvider = (props: AuthContextProviderProps) => {
  const authProps = useAuth({
    serverHost: props.serverHost,
    webHost: props.webHost,
  });

  return <AuthContext.Provider value={authProps}>{props.children}</AuthContext.Provider>;
};
