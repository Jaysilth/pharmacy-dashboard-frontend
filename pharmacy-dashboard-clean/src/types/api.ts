// These mirror the Spring Boot backend's DTOs field-for-field.

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface Medicine {
  id: number;
  name: string;
  quantity: number;
  price: number;
  expiryDate: string;
  lowStockThreshold: number;
  description?: string | null;
  manufacturer?: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isLowStock: boolean;
}

export interface MedicineInput {
  name: string;
  quantity: number;
  price: number;
  expiryDate: string;
  lowStockThreshold?: number;
  description?: string;
  manufacturer?: string;
}

export interface SaleMedicineInfo {
  id: number;
  name: string;
  manufacturer?: string | null;
}

export interface Sale {
  id: number;
  medicine: SaleMedicineInfo;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface SaleInput {
  medicineId: number;
  quantity: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface JwtResponse {
  tokenType: string;
  accessToken: string;
}

export type ValidationErrors = Record<string, string>;

// ── User Management ──────────────────────────────────────────────────────────

/**
 * Mirrors UserResponseDTO from the backend.
 * roles is a Set<String> in Java → string[] in JSON.
 */
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  accountNonLocked: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

/** Mirrors UserRequestDTO — used for both create and update. */
export interface UserInput {
  username: string;
  email: string;
  password: string;
  roles: string[];
}
