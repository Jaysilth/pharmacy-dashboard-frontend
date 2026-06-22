import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import type {
  Medicine,
  MedicineInput,
  Sale,
  SaleInput,
  LoginRequest,
  JwtResponse,
} from "@/types/api";

// ── Query key factories ──────────────────────────────────────────────────────

export const QK = {
  medicines: (params?: { search?: string }) =>
    params?.search ? ["medicines", params.search] : ["medicines"],
  medicine: (id: number) => ["medicines", id],
  sales: (params?: { medicineId?: number; limit?: number }) =>
    ["sales", params ?? {}],
  dashboardSummary: () => ["dashboard", "summary"],
  salesByDay: () => ["dashboard", "sales-by-day"],
  lowStockMedicines: () => ["dashboard", "low-stock"],
  expiringSoonMedicines: () => ["dashboard", "expiring-soon"],
  recentSales: () => ["dashboard", "recent-sales"],
} as const;

// ── Medicine hooks ───────────────────────────────────────────────────────────

export function useGetMedicines(
  params?: { search?: string },
  options?: Omit<UseQueryOptions<Medicine[]>, "queryKey" | "queryFn">,
) {
  const searchParam = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
  return useQuery<Medicine[]>({
    queryKey: QK.medicines(params),
    queryFn: () => apiRequest<Medicine[]>(`/api/medicines${searchParam}`),
    ...options,
  });
}

export function useGetMedicine(
  id: number,
  options?: Omit<UseQueryOptions<Medicine>, "queryKey" | "queryFn">,
) {
  return useQuery<Medicine>({
    queryKey: QK.medicine(id),
    queryFn: () => apiRequest<Medicine>(`/api/medicines/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MedicineInput) =>
      apiRequest<Medicine>("/api/medicines", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.medicines() });
      qc.invalidateQueries({ queryKey: QK.dashboardSummary() });
      qc.invalidateQueries({ queryKey: QK.lowStockMedicines() });
      qc.invalidateQueries({ queryKey: QK.expiringSoonMedicines() });
    },
  });
}

export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MedicineInput }) =>
      apiRequest<Medicine>(`/api/medicines/${id}`, { method: "PUT", body: data }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: QK.medicines() });
      qc.invalidateQueries({ queryKey: QK.medicine(id) });
      qc.invalidateQueries({ queryKey: QK.dashboardSummary() });
      qc.invalidateQueries({ queryKey: QK.lowStockMedicines() });
      qc.invalidateQueries({ queryKey: QK.expiringSoonMedicines() });
    },
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest<void>(`/api/medicines/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.medicines() });
      qc.invalidateQueries({ queryKey: QK.dashboardSummary() });
      qc.invalidateQueries({ queryKey: QK.lowStockMedicines() });
      qc.invalidateQueries({ queryKey: QK.expiringSoonMedicines() });
    },
  });
}

// ── Sale hooks ───────────────────────────────────────────────────────────────

export function useGetSales(
  params?: { medicineId?: number; limit?: number },
  options?: Omit<UseQueryOptions<Sale[]>, "queryKey" | "queryFn">,
) {
  const qs = new URLSearchParams();
  if (params?.medicineId != null) qs.set("medicineId", String(params.medicineId));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";

  return useQuery<Sale[]>({
    queryKey: QK.sales(params),
    queryFn: () => apiRequest<Sale[]>(`/api/sales${query}`),
    ...options,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SaleInput) =>
      apiRequest<Sale>("/api/sales", { method: "POST", body: data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sales() });
      qc.invalidateQueries({ queryKey: QK.medicines() });
      qc.invalidateQueries({ queryKey: QK.dashboardSummary() });
      qc.invalidateQueries({ queryKey: QK.salesByDay() });
      qc.invalidateQueries({ queryKey: QK.lowStockMedicines() });
      qc.invalidateQueries({ queryKey: QK.recentSales() });
    },
  });
}

// ── Dashboard hooks ──────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalMedicines: number;
  totalSalesToday: number;
  totalRevenueToday: number;
  lowStockCount: number;
  expiringSoonCount: number;
}

export interface SalesByDay {
  date: string;
  totalRevenue: number;
}

export function useGetDashboardSummary() {
  return useQuery<DashboardSummary>({
    queryKey: QK.dashboardSummary(),
    queryFn: () => apiRequest<DashboardSummary>("/api/dashboard/summary"),
  });
}

export function useGetSalesByDay() {
  return useQuery<SalesByDay[]>({
    queryKey: QK.salesByDay(),
    queryFn: () => apiRequest<SalesByDay[]>("/api/dashboard/sales-by-day"),
  });
}

export function useGetLowStockMedicines() {
  return useQuery<Medicine[]>({
    queryKey: QK.lowStockMedicines(),
    queryFn: () => apiRequest<Medicine[]>("/api/medicines/low-stock"),
  });
}

export function useGetExpiringSoonMedicines() {
  return useQuery<Medicine[]>({
    queryKey: QK.expiringSoonMedicines(),
    queryFn: () => apiRequest<Medicine[]>("/api/medicines/expiring-soon"),
  });
}

export function useGetRecentSales() {
  return useQuery<Sale[]>({
    queryKey: QK.recentSales(),
    queryFn: () => apiRequest<Sale[]>("/api/sales/recent"),
  });
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginRequest) =>
      apiRequest<JwtResponse>("/api/auth/login", { method: "POST", body: data }),
  });
}
