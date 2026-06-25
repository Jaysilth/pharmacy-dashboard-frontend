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
  apiRequest,
  ApiError,
} from "@/lib/api-client";
import type { UserProfile } from "@/types/api";

interface AuthContextValue {
  isAuthenticated: boolean;
  currentUser: UserProfile | null;
  isSuperAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Decodes the JWT payload (base64) to extract username and roles.
 * This is NOT signature verification — just reading the claims.
 * The backend verified the signature when it issued the token.
 * This lets us know the role instantly, with no API call needed.
 */
function decodeJwt(token: string): { sub: string; roles: string[] } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(window.atob(base64));
    return {
      sub: payload.sub ?? "",
      roles: Array.isArray(payload.roles) ? payload.roles : [],
    };
  } catch {
    return null;
  }
}

/**
 * Builds a minimal UserProfile from the JWT claims.
 * Enough to determine role and display username immediately.
 * The full profile (email, id, timestamps) loads in background via /me.
 */
function profileFromToken(token: string): UserProfile | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  return {
    id: 0,
    username: decoded.sub,
    email: "",
    enabled: true,
    accountNonLocked: true,
    roles: decoded.roles,
    createdAt: "",
    updatedAt: "",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!getToken(),
  );
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // On page load / refresh: decode existing token immediately so the
    // sidebar never shows "Loading..." — roles are available right away.
    const token = getToken();
    return token ? profileFromToken(token) : null;
  });

  const isSuperAdmin =
    currentUser?.roles?.includes("ROLE_SUPER_ADMIN") ?? false;

  const logout = useCallback(() => {
    clearToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, []);

  /**
   * Fetches full profile from /api/auth/me (email, id, timestamps).
   * Failure here does NOT affect authentication or role detection —
   * those come from the JWT claims decoded above.
   */
  const loadFullProfile = useCallback(async () => {
    try {
      const profile = await apiRequest<UserProfile>("/api/auth/me");
      setCurrentUser(profile);
    } catch (err) {
      // Only log out on 401 — anything else keeps the JWT-based session alive.
      if (err instanceof ApiError && err.status === 401) {
        logout();
      }
      // Other errors (404, 500, network): keep currentUser from JWT claims.
    }
  }, [logout]);

  /**
   * Called by the login page after a successful POST /api/auth/login.
   * Roles and username are available instantly from JWT claims.
   */
  const login = useCallback(
    (token: string) => {
      const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      setToken(cleanToken);

      // Decode roles and username immediately — no async needed
      const profile = profileFromToken(cleanToken);
      setCurrentUser(profile);
      setIsAuthenticated(true);

      // Load full profile in background for email/id/timestamps
      loadFullProfile();
    },
    [loadFullProfile],
  );

  // On page refresh: token was already decoded in useState initializer above.
  // Just fetch the full profile in background.
  useEffect(() => {
    if (getToken()) {
      loadFullProfile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Wire the global 401 handler.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getToken()) logout();
    });
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, currentUser, isSuperAdmin, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}