import { useState } from "react";
import { Link } from "wouter";
import { useGetMedicines, useDeleteMedicine } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ExternalLink, Edit, Trash2 } from "lucide-react";
import { MedicineFormModal } from "@/components/medicine-form-modal";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "",          label: "All" },
  { value: "EYEDROP",   label: "Eye Drop" },
  { value: "TABLET",    label: "Tablet" },
  { value: "INJECTION", label: "Injection" },
  { value: "SYRUP",     label: "Ointment" },
];

const CATEGORY_BADGE: Record<string, string> = {
  EYEDROP:   "bg-sky-50 text-sky-700 border-sky-200",
  TABLET:    "bg-violet-50 text-violet-700 border-violet-200",
  INJECTION: "bg-rose-50 text-rose-700 border-rose-200",
  SYRUP:     "bg-amber-50 text-amber-700 border-amber-200",
};

const CATEGORY_LABEL: Record<string, string> = {
  EYEDROP:   "Eye Drop",
  TABLET:    "Tablet",
  INJECTION: "Injection",
  SYRUP:     "Ointment",
};

export default function Medicines() {
  const [search, setSearch]       = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const { toast } = useToast();

  const { data: medicines, isLoading } = useGetMedicines(
    { search: search || undefined },
  );

  const deleteMedicine = useDeleteMedicine();

  const filtered = medicines?.filter(m =>
    !activeCategory || m.category === activeCategory
  ) ?? [];

  const handleDelete = (id: number, name: string) => {
    deleteMedicine.mutate(id, {
      onSuccess: () => toast({ title: `${name} deleted.` }),
      onError: (err) => toast({ title: "Delete failed", description: String(err), variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Medicines Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage all available pharmaceutical stock.</p>
        </div>
        <MedicineFormModal />
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or manufacturer…" className="pl-9 bg-background"
              value={search} onChange={e => setSearch(e.target.value)}
              data-testid="input-search-medicines" />
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setActiveCategory(cat.value)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  activeCategory === cat.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                )}>
                {cat.label}
                {cat.value !== "" && medicines && (
                  <span className="ml-1.5 opacity-60">
                    ({medicines.filter(m => m.category === cat.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length > 0 ? (
                filtered.map(med => (
                  <TableRow key={med.id} className="hover:bg-muted/10 transition-colors"
                    data-testid={`row-medicine-${med.id}`}>
                    {/* ── ONLY CHANGED CELL: now shows batch label badge ── */}
                    <TableCell className="pl-6 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{med.name}</span>
                        {med.batchLabel && (
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px] px-1.5 py-0 bg-muted/50 text-muted-foreground border-border"
                          >
                            Batch {med.batchLabel}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {med.category ? (
                        <Badge variant="outline" className={CATEGORY_BADGE[med.category] ?? ""}>
                          {CATEGORY_LABEL[med.category] ?? med.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{med.manufacturer ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">₦{Number(med.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{med.quantity}</TableCell>
                    <TableCell>
                      {med.quantity <= med.lowStockThreshold ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="icon" asChild
                          data-testid={`button-view-${med.id}`}>
                          <Link href={`/medicines/${med.id}`}>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </Link>
                        </Button>
                        <MedicineFormModal medicine={med} trigger={
                          <Button variant="ghost" size="icon" data-testid={`button-edit-${med.id}`}>
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        } />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              data-testid={`button-delete-${med.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {med.name}{med.batchLabel ? ` (Batch ${med.batchLabel})` : ""}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes this batch from your inventory.
                                This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(med.id, med.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {search
                      ? `No medicines matching "${search}".`
                      : activeCategory
                      ? `No ${CATEGORY_LABEL[activeCategory]} medicines found.`
                      : "No medicines yet. Add one to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}