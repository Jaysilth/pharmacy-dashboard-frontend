import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMedicines, useGetGlasses, useGetSurgeries,
  useGetGlassesAccessories, useGetGlassesRepairs, useCreateSale,
} from "@/lib/queries";
import { useClinical } from "@/context/ClinicalContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard,
  Pill, Glasses, Package, Wrench, Stethoscope,
  Calendar, FileText, FlaskConical, Tag, Percent, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ItemTab =
  | "MEDICINE" | "GLASSES" | "GLASSES_ACCESSORY" | "GLASSES_REPAIR"
  | "SURGERY" | "CLINIC_VISIT" | "PROCEDURE" | "LAB_TEST";

type PaymentMethod = "CASH" | "CARD" | "INSURANCE" | "TRANSFER";

interface CartItem {
  itemType:  ItemTab;
  itemId:    number;
  itemName:  string;
  unitPrice: number;
  quantity:  number;
  // only set for clinical items (no DB backing)
  isClinical?: boolean;
}

const TABS: { value: ItemTab; label: string; icon: React.ElementType; color: string; group: string }[] = [
  { value: "MEDICINE",          label: "Medicines",    icon: Pill,          color: "text-blue-600",   group: "Inventory"  },
  { value: "GLASSES",           label: "Glasses",      icon: Glasses,       color: "text-violet-600", group: "Inventory"  },
  { value: "GLASSES_ACCESSORY", label: "Accessories",  icon: Package,       color: "text-orange-600", group: "Inventory"  },
  { value: "GLASSES_REPAIR",    label: "Repairs",      icon: Wrench,        color: "text-gray-600",   group: "Services"   },
  { value: "SURGERY",           label: "Surgeries",    icon: Stethoscope,   color: "text-rose-600",   group: "Services"   },
  { value: "CLINIC_VISIT",      label: "Visits",       icon: Calendar,      color: "text-emerald-600", group: "Clinical"  },
  { value: "PROCEDURE",         label: "Procedures",   icon: FileText,      color: "text-indigo-600", group: "Clinical"   },
  { value: "LAB_TEST",          label: "Lab Tests",    icon: FlaskConical,  color: "text-amber-600",  group: "Clinical"   },
];

const BADGE_COLORS: Record<string, string> = {
  MEDICINE:          "bg-blue-50 text-blue-700 border-blue-200",
  GLASSES:           "bg-violet-50 text-violet-700 border-violet-200",
  GLASSES_ACCESSORY: "bg-orange-50 text-orange-700 border-orange-200",
  GLASSES_REPAIR:    "bg-gray-50 text-gray-700 border-gray-200",
  SURGERY:           "bg-rose-50 text-rose-700 border-rose-200",
  CLINIC_VISIT:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  PROCEDURE:         "bg-indigo-50 text-indigo-700 border-indigo-200",
  LAB_TEST:          "bg-amber-50 text-amber-700 border-amber-200",
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH",      label: "Cash" },
  { value: "CARD",      label: "Card" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "TRANSFER",  label: "Transfer" },
];

export default function NewSale() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createSale = useCreateSale();
  const clinical = useClinical();

  const [tab, setTab]           = useState<ItemTab>("MEDICINE");
  const [search, setSearch]     = useState("");
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [customerName, setCN]   = useState("");
  const [customerPhone, setCP]  = useState("");
  const [paymentMethod, setPM]  = useState<PaymentMethod>("CASH");
  const [notes, setNotes]       = useState("");

  // ── Discount state ──
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountMode, setDiscountMode]       = useState<"FIXED" | "PERCENT">("FIXED");
  const [discountInput, setDiscountInput]     = useState("");

  const isInventory = ["MEDICINE", "GLASSES", "GLASSES_ACCESSORY"].includes(tab);
  const isService   = ["GLASSES_REPAIR", "SURGERY"].includes(tab);
  const isClinical  = ["CLINIC_VISIT", "PROCEDURE", "LAB_TEST"].includes(tab);

  const { data: medicines }    = useGetMedicines({ search: search || undefined },       { enabled: tab === "MEDICINE" });
  const { data: glasses }      = useGetGlasses({ search: search || undefined },         { enabled: tab === "GLASSES" });
  const { data: accessories }  = useGetGlassesAccessories({ search: search || undefined }, { enabled: tab === "GLASSES_ACCESSORY" });
  const { data: repairs }      = useGetGlassesRepairs(                                   { enabled: tab === "GLASSES_REPAIR" });
  const { data: surgeries }    = useGetSurgeries({ search: search || undefined },       { enabled: tab === "SURGERY" });

  const clinicalItems =
    tab === "CLINIC_VISIT" ? clinical.clinicVisits :
    tab === "PROCEDURE"    ? clinical.procedures :
    tab === "LAB_TEST"     ? clinical.labTests : [];

  // Build unified display list
  type DisplayItem = { id: number | string; name: string; price: number; quantity?: number; isClinical?: boolean };
  const displayItems: DisplayItem[] = (() => {
    if (tab === "MEDICINE") return (medicines ?? []).map(m => ({ id: m.id, name: m.batchLabel ? `${m.name} · Batch ${m.batchLabel}` : m.name, price: Number(m.price), quantity: m.quantity }));
    if (tab === "GLASSES")           return (glasses ?? []).map(g => ({ id: g.id, name: `${g.name}${g.brand ? ` (${g.brand})` : ""}`, price: Number(g.price), quantity: g.quantity }));
    if (tab === "GLASSES_ACCESSORY") return (accessories ?? []).map(a => ({ id: a.id, name: a.name, price: Number(a.price), quantity: a.quantity }));
    if (tab === "GLASSES_REPAIR")    return (repairs ?? []).map(r => ({ id: r.id, name: r.name, price: Number(r.price) }));
    if (tab === "SURGERY")           return (surgeries ?? []).map(s => ({ id: s.id, name: s.name, price: Number(s.price) }));
    return clinicalItems.map(c => ({ id: c.id, name: c.name, price: c.price, isClinical: true }));
  })();

  const filteredDisplay = search && !isClinical
    ? displayItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : isClinical && search
    ? displayItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : displayItems;

  const addToCart = (item: DisplayItem) => {
    const key = `${tab}:${item.id}`;
    const existingIdx = cart.findIndex(c => `${c.itemType}:${c.itemId}` === key);
    if (existingIdx >= 0) {
      setCart(cart.map((c, i) => i === existingIdx ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, {
        itemType:  tab,
        itemId:    typeof item.id === "string" ? 0 : item.id,
        itemName:  item.name,
        unitPrice: item.price,
        quantity:  1,
        isClinical: item.isClinical,
      }]);
    }
  };

  const updateQty = (idx: number, delta: number) => {
    const next = cart[idx].quantity + delta;
    if (next <= 0) setCart(cart.filter((_, i) => i !== idx));
    else setCart(cart.map((c, i) => i === idx ? { ...c, quantity: next } : c));
  };

  // ── Discount calculations ──
  const subtotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);
  const parsedDiscount = parseFloat(discountInput) || 0;
  const discountAmount = !discountEnabled || parsedDiscount <= 0 ? 0
    : discountMode === "PERCENT"
      ? Math.min(subtotal, Math.round((subtotal * Math.min(parsedDiscount, 100)) / 100))
      : Math.min(subtotal, parsedDiscount);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleSubmit = () => {
    if (!customerName.trim()) { toast({ title: "Customer name is required.", variant: "destructive" }); return; }
    if (!customerPhone.trim()) { toast({ title: "Customer phone is required.", variant: "destructive" }); return; }
    if (cart.length === 0) { toast({ title: "Add at least one item.", variant: "destructive" }); return; }

    createSale.mutate({
      customerName:  customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod,
      notes: notes.trim() || undefined,
      // Include discount metadata for when backend supports it
      ...(discountEnabled && discountAmount > 0 ? {
        discountType:   discountMode,
        discountValue:  parsedDiscount,
        discountAmount: discountAmount,
      } : {}),
      items: cart.map(c => ({
        itemType:  c.itemType,
        itemId:    c.isClinical ? undefined as unknown as number : c.itemId,
        quantity:  c.quantity,
        // Clinical items: send name and price since they're not in the DB
        ...(c.isClinical ? { itemName: c.itemName, unitPrice: c.unitPrice } : {}),
      })),
    }, {
      onSuccess: () => { toast({ title: "Sale recorded." }); setLocation("/sales"); },
      onError:   (err) => {
        const msg = err instanceof ApiError ? err.message : "Failed to record sale.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  const groups = ["Inventory", "Services", "Clinical"];

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New Sale</h1>
        <p className="text-muted-foreground mt-1">Build a bill across medicines, eyewear, services, and clinical items.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Left: Item Browser ── */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-base">Add Items</CardTitle>

              {/* Group headers + tabs */}
              {groups.map(group => {
                const groupTabs = TABS.filter(t => t.group === group);
                return (
                  <div key={group} className="mt-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{group}</p>
                    <div className="flex gap-1 flex-wrap">
                      {groupTabs.map(t => {
                        const Icon = t.icon;
                        const isActive = tab === t.value;
                        return (
                          <button key={t.value} onClick={() => { setTab(t.value); setSearch(""); }}
                            className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors",
                              isActive ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted/50")}>
                            <Icon className={cn("h-3.5 w-3.5", isActive ? "" : t.color)} />
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Search */}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder={`Search ${TABS.find(t => t.value === tab)?.label.toLowerCase() ?? ""}…`}
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-[350px] overflow-auto">
              {filteredDisplay.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {search ? `No results for "${search}".` : "Nothing here yet."}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredDisplay.map(item => {
                    const outOfStock = typeof item.quantity === "number" && item.quantity === 0;
                    return (
                      <div key={String(item.id)}
                        className={cn("flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors", outOfStock && "opacity-50")}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-mono text-primary">₦{item.price.toLocaleString()}.00</span>
                            {typeof item.quantity === "number" && (
                              <span className="text-xs text-muted-foreground">Stock: {item.quantity}</span>
                            )}
                            {item.isClinical && (
                              <span className="text-[10px] text-muted-foreground italic">local</span>
                            )}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-3 h-8 shrink-0"
                          disabled={outOfStock} onClick={() => addToCart(item)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer & Payment */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name *</label>
                  <Input placeholder="Full name" value={customerName} onChange={e => setCN(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone Number *</label>
                  <Input placeholder="+234…" value={customerPhone} onChange={e => setCP(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1"><CreditCard className="h-3 w-3" /> Payment Method</label>
                <div className="flex gap-2 flex-wrap">
                  {PAYMENT_METHODS.map(p => (
                    <button key={p.value} onClick={() => setPM(p.value)}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        paymentMethod === p.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted/50")}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes (optional)</label>
                <Input placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Cart ── */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm sticky top-4">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Cart
                {cart.length > 0 && <Badge className="ml-auto">{cart.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground px-4">
                  No items yet. Browse tabs and click Add.
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[420px] overflow-auto">
                  {cart.map((item, idx) => (
                    <div key={`${item.itemType}-${item.itemId}-${idx}`} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.itemName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className={cn("text-[10px] px-1 py-0", BADGE_COLORS[item.itemType])}>
                              {TABS.find(t => t.value === item.itemType)?.label ?? item.itemType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">₦{item.unitPrice.toLocaleString()}/ea</span>
                          </div>
                        </div>
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-destructive hover:text-destructive/80 mt-0.5 flex-shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(idx, -1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(idx, 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                        </div>
                        <span className="text-sm font-mono font-semibold text-primary">₦{(item.unitPrice * item.quantity).toLocaleString()}.00</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border px-4 py-4 space-y-3">

                {/* ── Discount toggle ── */}
                {cart.length > 0 && (
                  <div className="space-y-2">
                    <button
                      id="discount-toggle"
                      onClick={() => {
                        const next = !discountEnabled;
                        setDiscountEnabled(next);
                        if (!next) { setDiscountInput(""); }
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200",
                        discountEnabled
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60 hover:border-border/80"
                      )}
                    >
                      <Tag className="h-3.5 w-3.5" />
                      {discountEnabled ? "Discount Applied" : "Apply Discount"}
                      <ChevronDown className={cn("h-3.5 w-3.5 ml-auto transition-transform duration-200", discountEnabled && "rotate-180")} />
                    </button>

                    {/* ── Discount panel (collapsible) ── */}
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        discountEnabled ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="space-y-2 pt-1 pb-1">
                        {/* Mode toggle pills */}
                        <div className="flex gap-1.5">
                          <button
                            id="discount-mode-fixed"
                            onClick={() => { setDiscountMode("FIXED"); setDiscountInput(""); }}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors",
                              discountMode === "FIXED"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            ₦ Fixed
                          </button>
                          <button
                            id="discount-mode-percent"
                            onClick={() => { setDiscountMode("PERCENT"); setDiscountInput(""); }}
                            className={cn(
                              "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors",
                              discountMode === "PERCENT"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border text-muted-foreground hover:bg-muted/50"
                            )}
                          >
                            <Percent className="h-3 w-3" /> Percent
                          </button>
                        </div>

                        {/* Discount input */}
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            {discountMode === "FIXED" ? "₦" : "%"}
                          </span>
                          <Input
                            id="discount-value-input"
                            type="number"
                            min="0"
                            max={discountMode === "PERCENT" ? "100" : String(subtotal)}
                            step={discountMode === "PERCENT" ? "0.5" : "1"}
                            placeholder={discountMode === "FIXED" ? "Enter amount…" : "Enter percentage…"}
                            className="pl-7 h-8 text-sm"
                            value={discountInput}
                            onChange={e => {
                              const val = e.target.value;
                              // Prevent negatives
                              if (val && parseFloat(val) < 0) return;
                              // Prevent percent > 100
                              if (discountMode === "PERCENT" && parseFloat(val) > 100) return;
                              setDiscountInput(val);
                            }}
                          />
                        </div>

                        {/* Live discount preview */}
                        {discountAmount > 0 && (
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] text-muted-foreground">
                              {discountMode === "PERCENT" ? `${parsedDiscount}% off` : "Flat discount"}
                            </span>
                            <span className="text-xs font-mono font-semibold text-destructive">
                              −₦{discountAmount.toLocaleString()}.00
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Totals breakdown ── */}
                {discountEnabled && discountAmount > 0 ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Subtotal</span>
                      <span className="text-sm font-mono text-muted-foreground">₦{subtotal.toLocaleString()}.00</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Discount
                        {discountMode === "PERCENT" && <span className="text-[10px] opacity-70">({parsedDiscount}%)</span>}
                      </span>
                      <span className="text-sm font-mono font-semibold text-destructive">−₦{discountAmount.toLocaleString()}.00</span>
                    </div>
                    <div className="border-t border-dashed border-border pt-1.5 flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">Final Total</span>
                      <span className="text-xl font-bold font-mono text-primary">₦{finalTotal.toLocaleString()}.00</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
                    <span className="text-xl font-bold font-mono">₦{subtotal.toLocaleString()}.00</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setLocation("/sales")}>Cancel</Button>
                  <Button className="flex-1" disabled={createSale.isPending || cart.length === 0} onClick={handleSubmit}>
                    {createSale.isPending ? "Processing…" : "Complete Sale"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}