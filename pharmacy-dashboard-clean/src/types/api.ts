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
  category?: string | null;
  lowStockThreshold: number;
  description?: string | null;
  manufacturer?: string | null;
  batchLabel?: string | null;  // "A", "B", "C"...
  createdAt: string;
  updatedAt: string;
  isExpired: boolean;
  isLowStock: boolean;
}

export interface MedicineInput {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  expiryDate: string;
  lowStockThreshold?: number;
  description?: string;
  manufacturer?: string;
  batchAction?: string;
  targetBatchId?: number;
}

export interface BatchCheckResult {
  status: "NO_MATCH" | "EXACT_MATCH" | "NAME_EXISTS";
  exactMatchId?: number;
  exactMatchBatchLabel?: string;
  existingBatches: Medicine[];
}

export interface Glasses {
  id: number;
  name: string;
  brand?: string;
  frameType?: string;
  lensType?: string;
  color?: string;
  price: number;
  quantity: number;
  lowStockThreshold: number;
  description?: string;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlassesInput {
  name: string;
  brand?: string;
  frameType?: string;
  lensType?: string;
  color?: string;
  price: number;
  quantity: number;
  lowStockThreshold?: number;
  description?: string;
}

export interface Surgery {
  id: number;
  name: string;
  category?: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SurgeryInput {
  name: string;
  category?: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  active?: boolean;
}

export interface SaleItemResponse {
  itemType: "MEDICINE" | "GLASSES" | "SURGERY";
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  saleNumber: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  notes?: string;
  grandTotal?: number;
  // Discount fields (populated when backend supports them)
  discountType?: "FIXED" | "PERCENT";
  discountValue?: number;
  discountAmount?: number;
  items: SaleItemResponse[];
  createdAt: string;
  // legacy
  medicine?: { id: number; name: string; manufacturer?: string } | null;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface SaleItemInput {
  itemType: "MEDICINE" | "GLASSES" | "SURGERY";
  itemId: number;
  quantity: number;
  itemName: string;
  unitPrice: number;
}

export interface SaleInput {
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  notes?: string;
  // Discount fields — frontend always sends these; backend can ignore until ready
  discountType?: "FIXED" | "PERCENT";
  discountValue?: number;
  discountAmount?: number;
  items: { itemType: string; itemId: number; quantity: number }[];
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

export interface UserInput {
  username: string;
  email: string;
  password: string;
  roles: string[];
}

// ── Glasses Accessories ──────────────────────────────────────────────────────

export interface GlassesAccessory {
  id: number;
  name: string;
  accessoryType: "ROPE_THIN" | "ROPE_FAT" | "CASE_PLASTIC" | "CASE_WOODEN" | "CASE_PURSE" | "OTHER";
  price: number;
  quantity: number;
  lowStockThreshold: number;
  description?: string;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlassesAccessoryInput {
  name: string;
  accessoryType: string;
  price: number;
  quantity: number;
  lowStockThreshold?: number;
  description?: string;
}

// ── Glasses Repairs ──────────────────────────────────────────────────────────

export interface GlassesRepair {
  id: number;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GlassesRepairInput {
  name: string;
  description?: string;
  price: number;
  active?: boolean;
}

// ── Consumables ──────────────────────────────────────────────────────────────

export interface Consumable {
  id: number;
  name: string;
  description?: string;
  unit: string;
  quantityInStock: number;
  reorderLevel: number;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsumableInput {
  name: string;
  description?: string;
  unit: string;
  quantityInStock: number;
  reorderLevel?: number;
}

export interface ConsumableUsageInput {
  consumableId: number;
  quantityUsed: number;
  usedBy?: string;
  notes?: string;
  linkedEntityType?: "SURGERY" | "PROCEDURE" | "LAB_TEST";
  surgeryId?: number;
  procedureRef?: string;
  labTestRef?: string;
}

export interface ConsumableUsageRecord {
  id: number;
  consumableId: number;
  consumableName: string;
  unit: string;
  quantityUsed: number;
  usedBy?: string;
  notes?: string;
  usedAt: string;
  linkedEntityType?: string;
  surgeryId?: number;
  surgeryName?: string;
  procedureRef?: string;
  labTestRef?: string;
}

// ── IOLs (Intraocular Lenses) ───────────────────────────────────────────────
// Separate from Consumable: stock is tracked per (name, type, power), not per
// name+unit, and usage is always surgery-linked (cataract implant) — no
// procedure/lab-test linking like general consumables.

export type IolType = "RIGID" | "FOLDABLE";

export interface Iol {
  id: number;
  name: string;
  type: IolType;
  power: number;
  manufacturer?: string;
  description?: string;
  quantityInStock: number;
  reorderLevel: number;
  lowStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IolInput {
  name: string;
  type: IolType;
  power: number;
  manufacturer?: string;
  description?: string;
  quantityInStock: number;
  reorderLevel?: number;
}

export interface IolUsageInput {
  iolId: number;
  quantityUsed: number;
  surgeryId: number;
  usedBy?: string;
  notes?: string;
}

export interface IolUsageRecord {
  id: number;
  iolId: number;
  iolName: string;
  iolPower: number;
  quantityUsed: number;
  surgeryId: number;
  surgeryName: string;
  usedBy?: string;
  notes?: string;
  usedAt: string;
}

