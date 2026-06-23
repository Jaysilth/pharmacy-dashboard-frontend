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
import { Search, ExternalLink, Edit, Trash2, ArrowLeft } from "lucide-react";
import { MedicineFormModal } from "@/components/medicine-form-modal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function Medicines() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: medicines, isLoading } = useGetMedicines(
    { search: search || undefined },
  );

  const deleteMedicine = useDeleteMedicine();

  const handleDelete = (id: number, name: string) => {
    deleteMedicine.mutate(id, {
      onSuccess: () => toast({ title: `${name} deleted.` }),
      onError: (err) => toast({ title: "Delete failed", description: String(err), variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild title="Back to Dashboard">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-medicines-title">Medicines Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage all available pharmaceutical stock.</p>
          </div>
        </div>
        <MedicineFormModal />
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="py-4 px-6 border-b border-border bg-muted/20">
          <div className="flex items-center max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or manufacturer…"
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-medicines"
            />
          </div>
        </CardHeader>
       <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
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
                    <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-12 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : medicines && medicines.length > 0 ? (
                medicines.map((med) => (
                  <TableRow key={med.id} className="hover:bg-muted/10 transition-colors" data-testid={`row-medicine-${med.id}`}>
                    <TableCell className="pl-6 font-medium">{med.name}</TableCell>
                    <TableCell className="text-muted-foreground">{med.manufacturer ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">₦{med.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{med.quantity}</TableCell>
                    <TableCell>
                      {med.quantity <= med.lowStockThreshold ? (
                        <Badge variant="destructive">Low Stock</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">In Stock</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end items-center gap-1">
                        <Button variant="ghost" size="icon" asChild data-testid={`button-view-${med.id}`}>
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
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" data-testid={`button-delete-${med.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete {med.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This permanently removes {med.name} from your inventory. This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(med.id, med.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
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
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {search ? `No medicines matching "${search}".` : "No medicines yet. Add one to get started."}
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