import { useContext } from "preact/hooks";
import { AuthContext } from "./auth-context";
export const useAuthContext = () => useContext(AuthContext);
