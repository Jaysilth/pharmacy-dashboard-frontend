import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { getToken, setToken, clearToken, setUnauthorizedHandler, apiRequest, ApiError } from "@/lib/api-client";
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

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await apiRequest<UserProfile>("/api/auth/me");
      setCurrentUser(profile);
    } catch (err) {
      // Only log out on a genuine 401 (expired/invalid token).
      // A 404 means the endpoint doesn't exist yet — keep the session alive.
      // Any other error (500, network) also keeps the session alive.
      if (err instanceof ApiError && err.status === 401) {
        logout();
      } else {
        setCurrentUser(null);
      }
    }
  }, [logout]);

  const login = useCallback(async (token: string) => {
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    setToken(cleanToken);
    setIsAuthenticated(true);  // Authenticate immediately — never block on profile
    loadProfile();              // Load profile in background for role-based UI
  }, [loadProfile]);

  // On page refresh: token exists in localStorage, reload the profile.
  useEffect(() => {
    if (getToken() && !currentUser) {
      loadProfile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire the global 401 handler — any API call returning 401 auto-logs out.
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