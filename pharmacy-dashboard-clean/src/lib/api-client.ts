import type { ApiResponse, ValidationErrors } from "@/types/api";

const TOKEN_KEY = "pharmacy.auth.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: ValidationErrors;

  constructor(message: string, status: number, fieldErrors?: ValidationErrors) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  skipAuthLogout?: boolean; // 🟢 ADDED (prevents logout loops)
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {

  const token = getToken();

  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check backend connection.",
      0
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: ApiResponse<T> | null = null;

  try {
    payload = await response.json();
  } catch {
    // ignore non-JSON responses
  }

  // =========================
  // 🟢 FIXED 401 HANDLING
  // =========================
  if (response.status === 401) {
    clearToken();

    // 🔴 prevent redirect loop during login or retry calls
    if (!options.skipAuthLogout) {
      onUnauthorized?.();
    }

    throw new ApiError(
      payload?.message ?? "Session expired. Please login again.",
      401
    );
  }

  if (!response.ok || !payload || payload.success === false) {
    const fieldErrors =
      payload?.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? (payload.data as unknown as ValidationErrors)
        : undefined;

    throw new ApiError(
      payload?.message ?? `Request failed (${response.status})`,
      response.status,
      fieldErrors
    );
  }

  return payload.data as T;
}