import { useRoute, useLocation } from "wouter";
import { useGetSale, useDeleteSale } from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Trash2, User, CreditCard, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Sale } from "@/types/api";

const PAYMENT_COLORS: Record<string, string> = {
  CASH:      "bg-green-50 text-green-700 border-green-200",
  CARD:      "bg-blue-50 text-blue-700 border-blue-200",
  INSURANCE: "bg-purple-50 text-purple-700 border-purple-200",
  TRANSFER:  "bg-amber-50 text-amber-700 border-amber-200",
};

const ITEM_TYPE_COLORS: Record<string, string> = {
  MEDICINE: "bg-blue-50 text-blue-700 border-blue-200",
  GLASSES:  "bg-violet-50 text-violet-700 border-violet-200",
  SURGERY:  "bg-rose-50 text-rose-700 border-rose-200",
};

function saleTotal(sale: Sale): number {
  if (sale.grandTotal != null) return sale.grandTotal;
  if (sale.totalPrice != null) return sale.totalPrice;
  return 0;
}

function resolveItems(sale: Sale) {
  if (sale.items && sale.items.length > 0) return sale.items;
  // Legacy single-medicine sale
  if (sale.medicine) {
    return [{
      itemType: "MEDICINE" as const,
      itemId: sale.medicine.id,
      itemName: sale.medicine.name,
      quantity: sale.quantity ?? 1,
      unitPrice: sale.unitPrice ?? 0,
      subtotal: sale.totalPrice ?? 0,
    }];
  }
  return [];
}

export default function SaleDetail() {
  const [, params] = useRoute("/sales/:id");
  const [, setLocation] = useLocation();
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const id = params?.id ? parseInt(params.id) : 0;
  const { data: sale, isLoading } = useGetSale(id);
  const deleteSale = useDeleteSale();

  const handleDelete = () => {
    deleteSale.mutate(id, {
      onSuccess: () => {
        toast({ title: "Sale deleted." });
        setLocation("/sales");
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "Delete failed.";
        toast({ title: "Error", description: msg, variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-muted-foreground">
        Sale not found.
        <Button variant="link" onClick={() => setLocation("/sales")}>Back to Sales</Button>
      </div>
    );
  }

  const items = resolveItems(sale);
  const total = saleTotal(sale);

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/sales")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {sale.saleNumber ?? `SAL-${sale.id}`}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(sale.createdAt), "dd MMM yyyy, hh:mm a")}
            </p>
          </div>
        </div>

        {/* Delete — SUPER_ADMIN only */}
        {isSuperAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" /> Delete Sale
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {sale.saleNumber ?? `SAL-${sale.id}`}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the sale record. Stock levels will NOT be
                  automatically restored. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* ── Customer + Payment info ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Customer</p>
              <p className="font-semibold text-sm">{sale.customerName ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{sale.customerPhone ?? ""}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
              {sale.paymentMethod ? (
                <Badge variant="outline" className={PAYMENT_COLORS[sale.paymentMethod] ?? ""}>
                  {sale.paymentMethod}
                </Badge>
              ) : (
                <span className="text-sm text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Notes</p>
              <p className="text-sm">{sale.notes || <span className="text-muted-foreground italic">None</span>}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Items table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-0 pt-4 px-6">
          <CardTitle className="text-base">Items Sold</CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right pr-6">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No item details available.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/10">
                    <TableCell className="pl-6 font-medium">{item.itemName}</TableCell>
                    <TableCell>
                      <Badge variant="outline"
                        className={ITEM_TYPE_COLORS[item.itemType] ?? ""}>
                        {item.itemType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₦{Number(item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                    <TableCell className="text-right pr-6 font-mono font-semibold">
                      ₦{Number(item.subtotal).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Grand total row */}
          <div className="flex justify-end items-center gap-6 px-6 py-4 border-t border-border bg-muted/20">
            <span className="text-sm font-medium text-muted-foreground">Grand Total</span>
            <span className="text-xl font-bold font-mono text-foreground">
              ₦{total.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}