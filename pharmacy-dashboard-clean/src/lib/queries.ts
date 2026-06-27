import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import type {
  Medicine, MedicineInput,
  Glasses, GlassesInput,
  Surgery, SurgeryInput,
  Sale, SaleInput,
  LoginRequest, JwtResponse,
  UserProfile, UserInput,
  GlassesAccessory, GlassesAccessoryInput,
  GlassesRepair, GlassesRepairInput,
} from "@/types/api";

// ── Query key factories ──────────────────────────────────────────────────────
export const QK = {
  medicines:           (p?: { search?: string }) => p?.search ? ["medicines", p.search] : ["medicines"],
  medicine:            (id: number) => ["medicines", id],
  glasses:             (p?: { search?: string }) => p?.search ? ["glasses", p.search] : ["glasses"],
  glassesItem:         (id: number) => ["glasses", id],
  surgeries:           (p?: { search?: string }) => p?.search ? ["surgeries", p.search] : ["surgeries"],
  surgery:             (id: number) => ["surgeries", id],
  sales:               () => ["sales"],
  dashboardSummary:    () => ["dashboard", "summary"],
  salesByDay:          () => ["dashboard", "sales-by-day"],
  lowStockMedicines:   () => ["dashboard", "low-stock"],
  expiringSoonMedicines: () => ["dashboard", "expiring-soon"],
  recentSales:         () => ["dashboard", "recent-sales"],
  users:               () => ["users"],
} as const;

// ── Medicine hooks ───────────────────────────────────────────────────────────
export function useGetMedicines(params?: { search?: string }, options?: Omit<UseQueryOptions<Medicine[]>, "queryKey" | "queryFn">) {
  const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
  return useQuery<Medicine[]>({ queryKey: QK.medicines(params), queryFn: () => apiRequest<Medicine[]>(`/api/medicines${q}`), ...options });
}
export function useGetMedicine(id: number, options?: Omit<UseQueryOptions<Medicine>, "queryKey" | "queryFn">) {
  return useQuery<Medicine>({ queryKey: QK.medicine(id), queryFn: () => apiRequest<Medicine>(`/api/medicines/${id}`), enabled: !!id, ...options });
}
export function useCreateMedicine() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: MedicineInput) => apiRequest<Medicine>("/api/medicines", { method: "POST", body: d }), onSuccess: () => { qc.invalidateQueries({ queryKey: QK.medicines() }); qc.invalidateQueries({ queryKey: QK.dashboardSummary() }); } });
}
export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: MedicineInput }) => apiRequest<Medicine>(`/api/medicines/${id}`, { method: "PUT", body: data }), onSuccess: (_d, { id }) => { qc.invalidateQueries({ queryKey: QK.medicines() }); qc.invalidateQueries({ queryKey: QK.medicine(id) }); } });
}
export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<void>(`/api/medicines/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.medicines() }) });
}

// ── Glasses hooks ────────────────────────────────────────────────────────────
export function useGetGlasses(params?: { search?: string }, options?: Omit<UseQueryOptions<Glasses[]>, "queryKey" | "queryFn">) {
  const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
  return useQuery<Glasses[]>({ queryKey: QK.glasses(params), queryFn: () => apiRequest<Glasses[]>(`/api/glasses${q}`), ...options });
}
export function useGetGlassesById(id: number) {
  return useQuery<Glasses>({ queryKey: QK.glassesItem(id), queryFn: () => apiRequest<Glasses>(`/api/glasses/${id}`), enabled: !!id });
}
export function useCreateGlasses() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: GlassesInput) => apiRequest<Glasses>("/api/glasses", { method: "POST", body: d }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.glasses() }) });
}
export function useUpdateGlasses() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: GlassesInput }) => apiRequest<Glasses>(`/api/glasses/${id}`, { method: "PUT", body: data }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.glasses() }) });
}
export function useDeleteGlasses() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<void>(`/api/glasses/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.glasses() }) });
}

// ── Surgery hooks ────────────────────────────────────────────────────────────
export function useGetSurgeries(params?: { search?: string }, options?: Omit<UseQueryOptions<Surgery[]>, "queryKey" | "queryFn">) {
  const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
  return useQuery<Surgery[]>({ queryKey: QK.surgeries(params), queryFn: () => apiRequest<Surgery[]>(`/api/surgeries${q}`), ...options });
}
export function useCreateSurgery() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: SurgeryInput) => apiRequest<Surgery>("/api/surgeries", { method: "POST", body: d }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.surgeries() }) });
}
export function useUpdateSurgery() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: SurgeryInput }) => apiRequest<Surgery>(`/api/surgeries/${id}`, { method: "PUT", body: data }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.surgeries() }) });
}
export function useDeleteSurgery() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<void>(`/api/surgeries/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.surgeries() }) });
}

// ── Sale hooks ───────────────────────────────────────────────────────────────
export function useGetSales(options?: Omit<UseQueryOptions<Sale[]>, "queryKey" | "queryFn">) {
  return useQuery<Sale[]>({ queryKey: QK.sales(), queryFn: () => apiRequest<Sale[]>("/api/sales"), ...options });
}
export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: SaleInput) => apiRequest<Sale>("/api/sales", { method: "POST", body: d }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.sales() });
      qc.invalidateQueries({ queryKey: QK.medicines() });
      qc.invalidateQueries({ queryKey: QK.glasses() });
      qc.invalidateQueries({ queryKey: QK.dashboardSummary() });
      qc.invalidateQueries({ queryKey: QK.recentSales() });
    },
  });
}

// ── Dashboard hooks ──────────────────────────────────────────────────────────
export interface DashboardSummary { totalMedicines: number; totalSalesToday: number; totalRevenueToday: number; lowStockCount: number; expiringSoonCount: number; }
export interface SalesByDay { date: string; totalRevenue: number; }
export function useGetDashboardSummary() { return useQuery<DashboardSummary>({ queryKey: QK.dashboardSummary(), queryFn: () => apiRequest<DashboardSummary>("/api/dashboard/summary") }); }
export function useGetSalesByDay() { return useQuery<SalesByDay[]>({ queryKey: QK.salesByDay(), queryFn: () => apiRequest<SalesByDay[]>("/api/dashboard/sales-by-day") }); }
export function useGetLowStockMedicines() { return useQuery<Medicine[]>({ queryKey: QK.lowStockMedicines(), queryFn: () => apiRequest<Medicine[]>("/api/medicines/low-stock") }); }
export function useGetExpiringSoonMedicines() { return useQuery<Medicine[]>({ queryKey: QK.expiringSoonMedicines(), queryFn: () => apiRequest<Medicine[]>("/api/medicines/expiring-soon") }); }
export function useGetRecentSales() { return useQuery<Sale[]>({ queryKey: QK.recentSales(), queryFn: () => apiRequest<Sale[]>("/api/sales/recent") }); }

// ── Auth ─────────────────────────────────────────────────────────────────────
export function useLogin() { return useMutation({ mutationFn: (d: LoginRequest) => apiRequest<JwtResponse>("/api/auth/login", { method: "POST", body: d }) }); }

// ── User Management hooks ────────────────────────────────────────────────────
export function useGetUsers(options?: Omit<UseQueryOptions<UserProfile[]>, "queryKey" | "queryFn">) {
  return useQuery<UserProfile[]>({ queryKey: QK.users(), queryFn: () => apiRequest<UserProfile[]>("/api/users"), ...options });
}
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: UserInput) => apiRequest<UserProfile>("/api/users", { method: "POST", body: d }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.users() }) });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: Partial<UserInput> }) => apiRequest<UserProfile>(`/api/users/${id}`, { method: "PUT", body: data }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.users() }) });
}
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<void>(`/api/users/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.users() }) });
}
export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<UserProfile>(`/api/users/${id}/activate`, { method: "PATCH" }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.users() }) });
}
export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<UserProfile>(`/api/users/${id}/deactivate`, { method: "PATCH" }), onSuccess: () => qc.invalidateQueries({ queryKey: QK.users() }) });
}
export function useGetSale(id: number, options?: Omit<UseQueryOptions<Sale>, "queryKey" | "queryFn">) {
  return useQuery<Sale>({
    queryKey: ["sales", id],
    queryFn: () => apiRequest<Sale>(`/api/sales/${id}`),
    enabled: !!id,
    ...options,
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiRequest<void>(`/api/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.sales() }),
  });
}

// ── Glasses Accessories ──────────────────────────────────────────────────────

export function useGetGlassesAccessories(params?: { search?: string }, options?: Omit<UseQueryOptions<GlassesAccessory[]>, "queryKey" | "queryFn">) {
  const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : "";
  return useQuery<GlassesAccessory[]>({ queryKey: ["glasses-accessories", params ?? {}], queryFn: () => apiRequest<GlassesAccessory[]>(`/api/glasses-accessories${q}`), ...options });
}
export function useCreateGlassesAccessory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: GlassesAccessoryInput) => apiRequest<GlassesAccessory>("/api/glasses-accessories", { method: "POST", body: d }), onSuccess: () => qc.invalidateQueries({ queryKey: ["glasses-accessories"] }) });
}
export function useUpdateGlassesAccessory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: GlassesAccessoryInput }) => apiRequest<GlassesAccessory>(`/api/glasses-accessories/${id}`, { method: "PUT", body: data }), onSuccess: () => qc.invalidateQueries({ queryKey: ["glasses-accessories"] }) });
}
export function useDeleteGlassesAccessory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<void>(`/api/glasses-accessories/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["glasses-accessories"] }) });
}

// ── Glasses Repairs ──────────────────────────────────────────────────────────

export function useGetGlassesRepairs(options?: Omit<UseQueryOptions<GlassesRepair[]>, "queryKey" | "queryFn">) {
  return useQuery<GlassesRepair[]>({ queryKey: ["glasses-repairs"], queryFn: () => apiRequest<GlassesRepair[]>("/api/glasses-repairs"), ...options });
}
export function useCreateGlassesRepair() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (d: GlassesRepairInput) => apiRequest<GlassesRepair>("/api/glasses-repairs", { method: "POST", body: d }), onSuccess: () => qc.invalidateQueries({ queryKey: ["glasses-repairs"] }) });
}
export function useUpdateGlassesRepair() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }: { id: number; data: GlassesRepairInput }) => apiRequest<GlassesRepair>(`/api/glasses-repairs/${id}`, { method: "PUT", body: data }), onSuccess: () => qc.invalidateQueries({ queryKey: ["glasses-repairs"] }) });
}
export function useDeleteGlassesRepair() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: number) => apiRequest<void>(`/api/glasses-repairs/${id}`, { method: "DELETE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["glasses-repairs"] }) });
}