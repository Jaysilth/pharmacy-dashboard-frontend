import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getToken, setToken, clearToken, setUnauthorizedHandler, apiRequest } from "@/lib/api-client";
import type { UserProfile } from "@/types/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  isSuperAdmin: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getToken());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const isSuperAdmin = currentUser?.roles?.includes("ROLE_SUPER_ADMIN") ?? false;

  /** Fetches /api/auth/me and stores the profile. */
  const loadProfile = useCallback(async () => {
    try {
      const profile = await apiRequest<UserProfile>("/api/auth/me");
      setCurrentUser(profile);
    } catch {
      // Token may be expired or invalid — clear everything
      clearToken();
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Called by the login page after a successful POST /api/auth/login.
   * Sets the token then immediately fetches the user profile so the
   * rest of the app knows the role without an extra page load.
   */
  const login = useCallback(async (token: string) => {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    setToken(cleanToken);
    await loadProfile();
    setIsAuthenticated(true);
  }, [loadProfile]);

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  // On app mount: if a token already exists in localStorage (page refresh),
  // reload the profile so role-based UI is correct immediately.
  useEffect(() => {
    if (getToken() && !currentUser) {
      loadProfile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire the 401 handler so any failed request auto-logs out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getToken()) logout();
    });
  }, [logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, isSuperAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
