import { useState } from "react";
import { useLocation } from "wouter";
import { useGetMedicines, useGetGlasses, useGetSurgeries, useCreateSale } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { SaleItemInput } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Minus, Trash2, ShoppingCart, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemTab = "MEDICINE" | "GLASSES" | "SURGERY";
type PaymentMethod = "CASH" | "CARD" | "INSURANCE" | "TRANSFER";

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

  const [tab, setTab] = useState<ItemTab>("MEDICINE");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<SaleItemInput[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [notes, setNotes] = useState("");

  const { data: medicines } = useGetMedicines({ search: search || undefined }, { enabled: tab === "MEDICINE" });
  const { data: glasses }   = useGetGlasses({ search: search || undefined },   { enabled: tab === "GLASSES" });
  const { data: surgeries } = useGetSurgeries({ search: search || undefined }, { enabled: tab === "SURGERY" });

  const addToCart = (item: { id: number; name: string; price: number }) => {
    const existing = cart.findIndex(c => c.itemType === tab && c.itemId === item.id);
    if (existing >= 0) {
      setCart(cart.map((c, i) => i === existing ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { itemType: tab, itemId: item.id, itemName: item.name, unitPrice: item.price, quantity: 1 }]);
    }
  };

  const updateQty = (idx: number, delta: number) => {
    const next = cart[idx].quantity + delta;
    if (next <= 0) removeItem(idx);
    else setCart(cart.map((c, i) => i === idx ? { ...c, quantity: next } : c));
  };

  const removeItem = (idx: number) => setCart(cart.filter((_, i) => i !== idx));

  const grandTotal = cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0);

  const handleSubmit = () => {
    if (!customerName.trim()) { toast({ title: "Customer name is required.", variant: "destructive" }); return; }
    if (!customerPhone.trim()) { toast({ title: "Customer phone is required.", variant: "destructive" }); return; }
    if (cart.length === 0) { toast({ title: "Add at least one item.", variant: "destructive" }); return; }

    createSale.mutate({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod,
      notes: notes.trim() || undefined,
      items: cart.map(c => ({ itemType: c.itemType, itemId: c.itemId, quantity: c.quantity })),
    }, {
      onSuccess: () => { toast({ title: "Sale recorded." }); setLocation("/sales"); },
      onError: (err) => { const msg = err instanceof ApiError ? err.message : "Failed to record sale."; toast({ title: "Error", description: msg, variant: "destructive" }); },
    });
  };

  const currentItems = tab === "MEDICINE" ? medicines : tab === "GLASSES" ? glasses : surgeries;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New Sale</h1>
        <p className="text-muted-foreground mt-1">Add medicines, glasses, or surgeries to the cart.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Left: Item Browser ── */}
        <div className="lg:col-span-3 space-y-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Items</CardTitle>
              <div className="flex gap-1 mt-2">
                {(["MEDICINE", "GLASSES", "SURGERY"] as ItemTab[]).map(t => (
                  <button key={t} onClick={() => { setTab(t); setSearch(""); }}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                      tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}>
                    {t === "MEDICINE" ? "Medicines" : t === "GLASSES" ? "Glasses" : "Surgeries"}
                  </button>
                ))}
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 h-9" placeholder={`Search ${tab.toLowerCase()}…`}
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[380px] overflow-auto">
              {!currentItems || currentItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {search ? `No results for "${search}"` : `No ${tab.toLowerCase()} found.`}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {currentItems.map((item: { id: number; name: string; price: number; quantity?: number; active?: boolean }) => {
                    const outOfStock = ("quantity" in item) && typeof item.quantity === "number" && item.quantity === 0;
                    return (
                      <div key={item.id} className={cn("flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors", outOfStock && "opacity-50")}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm font-mono text-primary">₦{Number(item.price).toFixed(2)}</span>
                            {("quantity" in item) && <span className="text-xs text-muted-foreground">Stock: {item.quantity}</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="ml-3 h-8 shrink-0"
                          disabled={outOfStock} onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price) })}>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Customer Name *</label>
                  <Input placeholder="Full name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone Number *</label>
                  <Input placeholder="+234..." value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1"><CreditCard className="h-3 w-3" /> Payment Method</label>
                <div className="flex gap-2 flex-wrap">
                  {PAYMENT_METHODS.map(p => (
                    <button key={p.value} onClick={() => setPaymentMethod(p.value)}
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
        <div className="lg:col-span-2 space-y-3">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" /> Cart
                {cart.length > 0 && <Badge className="ml-auto">{cart.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cart.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground px-4">
                  No items added yet. Browse and click Add.
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[300px] overflow-auto">
                  {cart.map((item, idx) => (
                    <div key={`${item.itemType}-${item.itemId}`} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 mr-1">{item.itemType}</Badge>
                            ₦{item.unitPrice.toFixed(2)} each
                          </p>
                        </div>
                        <button onClick={() => removeItem(idx)} className="text-destructive hover:text-destructive/80 mt-0.5">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(idx, -1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(idx, 1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-mono font-semibold text-primary">
                          ₦{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-border px-4 py-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Total Amount</span>
                  <span className="text-xl font-bold font-mono text-foreground">₦{grandTotal.toFixed(2)}</span>
                </div>
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
