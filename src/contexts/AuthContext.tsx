import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState(() => localStorage.getItem("ets2_admin_token"));

  const login = useCallback((newToken: string) => {
    setToken(newToken);
    localStorage.setItem("ets2_admin_token", newToken);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem("ets2_admin_token");
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: Boolean(token), login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
