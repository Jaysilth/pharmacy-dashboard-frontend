import { useGetSales, useDeleteSale } from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import type { Sale } from "@/types/api";

const PAYMENT_COLORS: Record<string, string> = {
  CASH:      "bg-green-50 text-green-700 border-green-200",
  CARD:      "bg-blue-50 text-blue-700 border-blue-200",
  INSURANCE: "bg-purple-50 text-purple-700 border-purple-200",
  TRANSFER:  "bg-amber-50 text-amber-700 border-amber-200",
};

function saleTotal(sale: Sale): number {
  if (sale.grandTotal != null) return sale.grandTotal;
  if (sale.totalPrice != null) return sale.totalPrice;
  return 0;
}

function itemCount(sale: Sale): number {
  if (sale.items && sale.items.length > 0) return sale.items.length;
  return sale.quantity != null ? 1 : 0;
}

export default function Sales() {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const { data: sales, isLoading } = useGetSales();
  const deleteSale = useDeleteSale();
  const [search, setSearch] = useState("");

  const filtered = sales?.filter(s => {
    const q = search.toLowerCase();
    return !q ||
      s.saleNumber?.toLowerCase().includes(q) ||
      s.customerName?.toLowerCase().includes(q) ||
      s.customerPhone?.toLowerCase().includes(q);
  }) ?? [];

  const handleDelete = (sale: Sale) => {
    deleteSale.mutate(sale.id, {
      onSuccess: () => toast({ title: `Sale ${sale.saleNumber ?? sale.id} deleted.` }),
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Delete failed.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  // Column layout depends on whether SUPER_ADMIN (extra delete column)
  const gridCols = isSuperAdmin
    ? "grid-cols-[1.4fr_1fr_1.2fr_0.6fr_0.7fr_0.7fr_auto]"
    : "grid-cols-[1.4fr_1fr_1.2fr_0.6fr_0.7fr_0.7fr]";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Management</h1>
          <p className="text-muted-foreground mt-1">Manage point of sale and view sales history.</p>
        </div>
        <Button asChild>
          <Link href="/sales/new"><Plus className="mr-2 h-4 w-4" /> New Sale</Link>
        </Button>
      </div>

      <Card className="shadow-sm border-border">
        <div className="px-4 py-3 border-b border-border bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9 bg-background"
              placeholder="Search by sale #, customer name or phone…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <CardContent className="p-0">
          {/* Header */}
          <div className={`hidden md:grid ${gridCols} gap-4 px-6 py-3 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border`}>
            <span>Sale #</span>
            <span>Date</span>
            <span>Customer</span>
            <span>Items</span>
            <span>Payment</span>
            <span className="text-right">Total</span>
            {isSuperAdmin && <span />}
          </div>

          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-6 py-4 border-b border-border last:border-0">
                <Skeleton className="h-5 w-full" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              {search ? `No sales matching "${search}".` : "No sales recorded yet."}
            </div>
          ) : (
            filtered.map(sale => (
              <div key={sale.id}
                className={`grid grid-cols-1 md:${gridCols} gap-2 md:gap-4 px-6 py-4 border-b border-border last:border-0 hover:bg-muted/10 transition-colors items-center`}>

                {/* Sale # — clickable for both roles */}
                <div>
                  <Link href={`/sales/${sale.id}`}
                    className="font-mono text-sm font-semibold text-primary hover:underline underline-offset-2">
                    {sale.saleNumber ?? `SAL-${sale.id}`}
                  </Link>
                </div>

                {/* Date */}
                <div className="text-sm text-muted-foreground">
                  {format(new Date(sale.createdAt), "dd MMM yyyy, hh:mm a")}
                </div>

                {/* Customer */}
                <div>
                  {sale.customerName ? (
                    <>
                      <p className="text-sm font-medium">{sale.customerName}</p>
                      {sale.customerPhone && (
                        <p className="text-xs text-muted-foreground">{sale.customerPhone}</p>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No customer info</span>
                  )}
                </div>

                {/* Items */}
                <div className="text-sm text-muted-foreground">
                  {itemCount(sale)} item{itemCount(sale) !== 1 ? "s" : ""}
                </div>

                {/* Payment */}
                <div>
                  {sale.paymentMethod ? (
                    <Badge variant="outline" className={PAYMENT_COLORS[sale.paymentMethod] ?? ""}>
                      {sale.paymentMethod}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>

                {/* Total */}
                <div className="text-right font-mono font-semibold text-sm text-foreground">
                  ₦{saleTotal(sale).toFixed(2)}
                </div>

                {/* Delete — SUPER_ADMIN only */}
                {isSuperAdmin && (
                  <div className="flex justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Delete {sale.saleNumber ?? `SAL-${sale.id}`}?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the sale record. Stock levels will NOT
                            be automatically restored. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(sale)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}