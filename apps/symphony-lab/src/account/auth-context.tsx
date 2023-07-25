import { createContext, useContext } from "react";
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

export const AuthContextProvider = (props: { children?: JSX.Element | JSX.Element[] }) => {
  const authProps = useAuth();

  return <AuthContext.Provider value={authProps}>{props.children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
