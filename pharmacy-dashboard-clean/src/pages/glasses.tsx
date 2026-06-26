import { useState } from "react";
import { useGetGlasses, useDeleteGlasses, useCreateGlasses, useUpdateGlasses } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { Glasses, GlassesInput } from "@/types/api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search } from "lucide-react";

// ── Schema ─────────────────────────────────────────────────────────────────
const schema = z.object({
  name:              z.string().min(1, "Name is required"),
  brand:             z.string().optional(),
  frameType:         z.string().optional(),
  lensType:          z.string().optional(),
  color:             z.string().optional(),
  price:             z.coerce.number().min(0.01, "Price must be greater than 0"),
  quantity:          z.coerce.number().min(0, "Quantity must be 0 or more"),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  description:       z.string().optional(),
});
type GlassesForm = z.infer<typeof schema>;

const defaultValues: GlassesForm = { name: "", brand: "", frameType: "", lensType: "", color: "", price: 0, quantity: 0, lowStockThreshold: 5, description: "" };

// ── Form Modal ─────────────────────────────────────────────────────────────
function GlassesFormModal({ glasses, trigger }: { glasses?: Glasses; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useCreateGlasses();
  const update = useUpdateGlasses();

  const form = useForm<GlassesForm>({
    resolver: zodResolver(schema) as Resolver<GlassesForm>,
    defaultValues: glasses ? {
      name: glasses.name, brand: glasses.brand ?? "", frameType: glasses.frameType ?? "",
      lensType: glasses.lensType ?? "", color: glasses.color ?? "",
      price: glasses.price, quantity: glasses.quantity,
      lowStockThreshold: glasses.lowStockThreshold, description: glasses.description ?? "",
    } : defaultValues,
  });

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) form.reset(glasses ? {
      name: glasses.name, brand: glasses.brand ?? "", frameType: glasses.frameType ?? "",
      lensType: glasses.lensType ?? "", color: glasses.color ?? "",
      price: glasses.price, quantity: glasses.quantity,
      lowStockThreshold: glasses.lowStockThreshold, description: glasses.description ?? "",
    } : defaultValues);
  };

  const onSubmit = (values: GlassesForm) => {
    const payload: GlassesInput = { ...values, price: Number(values.price), quantity: Number(values.quantity) };
    const action = glasses
      ? update.mutate({ id: glasses.id, data: payload }, { onSuccess: () => { toast({ title: "Glasses updated." }); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : "Update failed.", variant: "destructive" }) })
      : create.mutate(payload, { onSuccess: () => { toast({ title: "Glasses added." }); form.reset(defaultValues); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : "Add failed.", variant: "destructive" }) });
    void action;
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="mr-2 h-4 w-4" />Add Glasses</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>{glasses ? "Edit Glasses" : "Add New Glasses"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="brand" render={({ field }) => (<FormItem><FormLabel>Brand</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="color" render={({ field }) => (<FormItem><FormLabel>Color</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="frameType" render={({ field }) => (<FormItem><FormLabel>Frame Type</FormLabel><FormControl><Input placeholder="Full Rim, Half Rim…" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="lensType" render={({ field }) => (<FormItem><FormLabel>Lens Type</FormLabel><FormControl><Input placeholder="Single Vision, Progressive…" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price (₦)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (<FormItem><FormLabel>Alert At</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{glasses ? "Save Changes" : "Add Glasses"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function GlassesPage() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { data: glasses, isLoading } = useGetGlasses({ search: search || undefined });
  const deleteGlasses = useDeleteGlasses();

  const handleDelete = (g: Glasses) => {
    deleteGlasses.mutate(g.id, {
      onSuccess: () => toast({ title: `${g.name} deleted.` }),
      onError: e => toast({ title: "Delete failed.", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Glasses Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage eyewear stock and pricing.</p>
        </div>
        <GlassesFormModal />
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 bg-background" placeholder="Search by name or brand…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Frame / Lens</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (<TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>))}
                </TableRow>
              )) : glasses && glasses.length > 0 ? glasses.map(g => (
                <TableRow key={g.id} className="hover:bg-muted/10">
                  <TableCell className="pl-6 font-medium">{g.name}</TableCell>
                  <TableCell className="text-muted-foreground">{g.brand ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{[g.frameType, g.lensType].filter(Boolean).join(" / ") || "—"}</TableCell>
                  <TableCell className="text-right font-mono">₦{Number(g.price).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">{g.quantity}</TableCell>
                  <TableCell>
                    {g.lowStock
                      ? <Badge variant="destructive">Low Stock</Badge>
                      : <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">In Stock</Badge>}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <GlassesFormModal glasses={g} trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-muted-foreground" /></Button>} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {g.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This permanently removes this item. Cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(g)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{search ? `No glasses matching "${search}".` : "No glasses yet. Add one to get started."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
