import {
  createContext, useContext, useState,
  useCallback, type ReactNode,
} from "react";

export interface ClinicalItem {
  id: string;
  name: string;
  category: string;
  customCategory?: string;
  price: number;
  description?: string;
}

type ClinicalType = "visits" | "procedures" | "labs";

interface ClinicalContextValue {
  clinicVisits:  ClinicalItem[];
  procedures:    ClinicalItem[];
  labTests:      ClinicalItem[];
  addItem:    (type: ClinicalType, item: Omit<ClinicalItem, "id">) => void;
  updateItem: (type: ClinicalType, id: string, item: Partial<ClinicalItem>) => void;
  removeItem: (type: ClinicalType, id: string) => void;
}

const KEYS = { visits: "jotess.clinicVisits", procedures: "jotess.procedures", labs: "jotess.labTests" };

const DEFAULT_VISITS: ClinicalItem[] = [
  { id: "v-1", name: "General Consultation",    category: "NEW",       price: 5000 },
  { id: "v-2", name: "Follow-up Consultation",  category: "FOLLOW_UP", price: 3000 },
];

const DEFAULT_PROCEDURES: ClinicalItem[] = [
  { id: "p-1", name: "Refraction",                  category: "REFRACTION",       price: 2000  },
  { id: "p-2", name: "Vitreous Interior Ocular",    category: "VIO",              price: 5000  },
  { id: "p-3", name: "Corneal Staining",             category: "CORNEAL_STAINING", price: 3000  },
  { id: "p-4", name: "Biometry",                    category: "BIOMETRY",          price: 10000 },
  { id: "p-5", name: "YAG Laser",                   category: "YAG_LASER",         price: 15000 },
  { id: "p-6", name: "OCT Scan",                    category: "OCT",               price: 20000 },
];

const DEFAULT_LABS: ClinicalItem[] = [
  { id: "l-1", name: "Retroviral Screening",  category: "RVS", price: 3000 },
  { id: "l-2", name: "Fasting Blood Sugar",   category: "FBS", price: 1500 },
];

function load<T>(key: string, fallback: T[]): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function save<T>(key: string, data: T[]): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function uid(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

const ClinicalContext = createContext<ClinicalContextValue | null>(null);

export function ClinicalProvider({ children }: { children: ReactNode }) {
  const [clinicVisits,  setVisits]  = useState<ClinicalItem[]>(() => load(KEYS.visits,     DEFAULT_VISITS));
  const [procedures,    setProcs]   = useState<ClinicalItem[]>(() => load(KEYS.procedures,  DEFAULT_PROCEDURES));
  const [labTests,      setLabs]    = useState<ClinicalItem[]>(() => load(KEYS.labs,        DEFAULT_LABS));

  const setter = (type: ClinicalType) => {
    if (type === "visits")     return setVisits;
    if (type === "procedures") return setProcs;
    return setLabs;
  };
  const key = (type: ClinicalType) => KEYS[type];

  const addItem = useCallback((type: ClinicalType, item: Omit<ClinicalItem, "id">) => {
    const newItem = { ...item, id: uid() };
    setter(type)((prev: ClinicalItem[]) => {
      const next = [...prev, newItem];
      save(key(type), next);
      return next;
    });
  }, []);

  const updateItem = useCallback((type: ClinicalType, id: string, item: Partial<ClinicalItem>) => {
    setter(type)((prev: ClinicalItem[]) => {
      const next = prev.map(i => i.id === id ? { ...i, ...item } : i);
      save(key(type), next);
      return next;
    });
  }, []);

  const removeItem = useCallback((type: ClinicalType, id: string) => {
    setter(type)((prev: ClinicalItem[]) => {
      const next = prev.filter(i => i.id !== id);
      save(key(type), next);
      return next;
    });
  }, []);

  return (
    <ClinicalContext.Provider value={{ clinicVisits, procedures, labTests, addItem, updateItem, removeItem }}>
      {children}
    </ClinicalContext.Provider>
  );
}

export function useClinical() {
  const ctx = useContext(ClinicalContext);
  if (!ctx) throw new Error("useClinical must be inside <ClinicalProvider>");
  return ctx;
}