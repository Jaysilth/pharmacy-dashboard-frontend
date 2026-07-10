import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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

// ── Configuration ─────────────────────────────────────────────────────────────

/** Inactivity window before auto-logout fires. */
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/**
 * Minimum interval between timer resets triggered by user activity.
 * Prevents mousemove from calling clearTimeout/setTimeout hundreds of
 * times per second — each DOM event still gets heard, but the timer
 * is only re-armed at most once every RESET_THROTTLE_MS.
 */
const RESET_THROTTLE_MS = 5_000; // 5 seconds

/**
 * Events that indicate genuine user presence.
 * mousemove is intentionally included but throttled so it doesn't
 * generate unnecessary overhead. keypress is deprecated — keydown
 * covers the same intent and is standard.
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "click",
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  isAuthenticated: boolean;
  // SECURITY FIX: isAuthenticated was set from token *presence* alone, so
  // protected UI could briefly render before the backend confirmed the
  // token was actually valid. isValidating exposes that in-flight check so
  // callers (see App.tsx) can hold off rendering until it resolves.
  isValidating: boolean;
  currentUser: UserProfile | null;
  isSuperAdmin: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── JWT decode (no signature verification — just reading claims) ───────────────

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

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!getToken(),
  );
  // Starts true only when there's a persisted token to confirm; if there's
  // no token at all, there's nothing to validate.
  const [isValidating, setIsValidating] = useState<boolean>(() => !!getToken());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const token = getToken();
    return token ? profileFromToken(token) : null;
  });

  const isSuperAdmin =
    currentUser?.roles?.includes("ROLE_SUPER_ADMIN") ?? false;

  // Refs for the inactivity timer, throttle timestamp, and profile fetch tracking.
  // Using refs (not state) because changing them must never trigger re-renders.
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetTimestampRef = useRef<number>(0);
  const profileRequestIdRef = useRef(0);

  // ── Core auth actions ──────────────────────────────────────────────────────

  const logout = useCallback(() => {
    profileRequestIdRef.current += 1;
    clearToken();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setIsValidating(false);

    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }, []);

  const logoutWithSessionExpiredMessage = useCallback(() => {
    logout();
    // Defer the alert one tick so React state updates flush first
    // and the app visually transitions to the login screen before the
    // dialog blocks the thread.
    setTimeout(() => {
      window.alert(
        "Session Expired: You have been automatically logged out due to 1 hour of inactivity.",
      );
    }, 0);
  }, [logout]);

  const loadFullProfile = useCallback(async () => {
    const requestId = profileRequestIdRef.current + 1;
    profileRequestIdRef.current = requestId;

    try {
      const profile = await apiRequest<UserProfile>("/api/auth/me");
      if (requestId === profileRequestIdRef.current) {
        setCurrentUser(profile);
      }
    } catch (err) {
      if (
        requestId === profileRequestIdRef.current &&
        err instanceof ApiError &&
        err.status === 401
      ) {
        logout();
      }
    } finally {
      if (requestId === profileRequestIdRef.current) {
        setIsValidating(false);
      }
    }
  }, [logout]);

  const login = useCallback(
    (token: string) => {
      const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      setToken(cleanToken);
      const profile = profileFromToken(cleanToken);
      setCurrentUser(profile);
      setIsAuthenticated(true);
      loadFullProfile();
    },
    [loadFullProfile],
  );

  // ── Inactivity timer ───────────────────────────────────────────────────────

  /**
   * Arms (or re-arms) the inactivity timer.
   * Clears any existing timer before setting a new one so only one
   * timer is ever live at a time.
   */
  const armTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(
      logoutWithSessionExpiredMessage,
      INACTIVITY_TIMEOUT_MS,
    );
  }, [logoutWithSessionExpiredMessage]);

  /**
   * Throttled activity handler.
   *
   * Every activity event calls this. If less than RESET_THROTTLE_MS has
   * passed since the last reset, the call is dropped — the timer is
   * already running with plenty of runway. This prevents the high-frequency
   * mousemove event from hammering clearTimeout/setTimeout in a tight loop.
   *
   * Passive event listeners (see addEventListener options below) mean the
   * browser never has to wait for this function before executing its default
   * scroll/touch behaviour.
   */
  const handleActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastResetTimestampRef.current < RESET_THROTTLE_MS) return;
    lastResetTimestampRef.current = now;
    armTimer();
  }, [armTimer]);

  /**
   * Main inactivity effect.
   *
   * Runs when authentication state changes. When the user logs in,
   * arms the timer and attaches listeners. When the user logs out
   * (including auto-logout), clears the timer and removes listeners.
   *
   * All listeners use `passive: true` so the browser can optimise
   * scroll and touch performance — our handler never calls
   * preventDefault(), so passive is safe for every event here.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up if somehow listeners are still attached after logout
      if (inactivityTimerRef.current !== null) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Arm the timer immediately on login / mount-while-authenticated
    armTimer();

    const listenerOptions: AddEventListenerOptions = { passive: true };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, listenerOptions);
    });

    return () => {
      // Always clear the timer and remove listeners on unmount or
      // when isAuthenticated flips to false. Prevents memory leaks
      // and phantom logout alerts after the user has already logged out.
      if (inactivityTimerRef.current !== null) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity, listenerOptions);
      });
    };
  }, [isAuthenticated, armTimer, handleActivity]);

  // ── Page load / refresh ────────────────────────────────────────────────────

  useEffect(() => {
    if (getToken()) {
      loadFullProfile();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getToken()) logout();
    });
  }, [logout]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isValidating, currentUser, isSuperAdmin, login, logout }}
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