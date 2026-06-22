import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

import {
  getToken,
  setToken,
  clearToken,
  setUnauthorizedHandler,
} from "@/lib/api-client";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!getToken();
  });

  // =========================
  // 🟢 FIX: CLEAN TOKEN HANDLING
  // =========================
  const login = useCallback((token: string) => {

    // 🔴 FIX: prevent "Bearer Bearer ..." bug
    const cleanToken = token.startsWith("Bearer ")
      ? token.slice(7)
      : token;

    setToken(cleanToken);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
  }, []);

  // =========================
  // 🟢 FIX: prevent aggressive logout loops
  // =========================
  useEffect(() => {
    setUnauthorizedHandler(() => {
      // only logout if actually authenticated
      if (getToken()) {
        logout();
      }
    });
  }, [logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}