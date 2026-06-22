// These mirror the Spring Boot backend's DTOs field-for-field. Keep them in
// sync with com.pharmacy.pharmacy_management.dto.* if the backend changes shape.

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
  expiryDate: string; // ISO date, e.g. "2026-12-31"
  lowStockThreshold: number;
  description?: string | null;
  manufacturer?: string | null;
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isLowStock: boolean;
}

// What the "add/edit medicine" form sends. Matches MedicineRequestDTO.
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
  createdAt: string; // ISO date-time
}

// What "record a sale" sends. Matches SaleRequestDTO.
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

// Shape returned by GlobalExceptionHandler for @Valid failures: a map of
// field name -> error message, delivered as ApiResponse<Record<string,string>>.
export type ValidationErrors = Record<string, string>;
