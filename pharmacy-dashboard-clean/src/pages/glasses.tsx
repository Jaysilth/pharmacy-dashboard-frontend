import { useState } from "react";
import {
  useGetGlasses, useDeleteGlasses, useCreateGlasses, useUpdateGlasses,
  useGetGlassesAccessories, useDeleteGlassesAccessory, useCreateGlassesAccessory, useUpdateGlassesAccessory,
  useGetGlassesRepairs, useDeleteGlassesRepair, useCreateGlassesRepair, useUpdateGlassesRepair,
} from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { Glasses, GlassesInput, GlassesAccessory, GlassesAccessoryInput, GlassesRepair, GlassesRepairInput } from "@/types/api";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"; // ← CHANGED: added ChevronLeft, ChevronRight
import { cn } from "@/lib/utils";

type GlassesTab = "FRAMES" | "ACCESSORIES" | "REPAIRS";

// ── ADDED: Pagination constant ─────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;

const ACCESSORY_TYPE_LABELS: Record<string, string> = {
  ROPE_THIN:    "Rope — Thin",
  ROPE_FAT:     "Rope — Fat",
  CASE_PLASTIC: "Case — Plastic",
  CASE_WOODEN:  "Case — Wooden",
  CASE_PURSE:   "Case — Purse",
  OTHER:        "Other",
};
const ACCESSORY_COLORS: Record<string, string> = {
  ROPE_THIN:    "bg-sky-50 text-sky-700 border-sky-200",
  ROPE_FAT:     "bg-blue-50 text-blue-700 border-blue-200",
  CASE_PLASTIC: "bg-amber-50 text-amber-700 border-amber-200",
  CASE_WOODEN:  "bg-orange-50 text-orange-700 border-orange-200",
  CASE_PURSE:   "bg-purple-50 text-purple-700 border-purple-200",
  OTHER:        "bg-zinc-100 text-zinc-800 border-zinc-200",
};

// ── ADDED: Reusable sort helper — sorts any array alphabetically by .name ──
function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) =>
    a.name.trim().toLowerCase().localeCompare(b.name.trim().toLowerCase())
  );
}

// ── ADDED: Reusable Pagination Controls component ──────────────────────────
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
}) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem   = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-border">
      {/* Item count */}
      <span className="text-sm text-muted-foreground">
        Showing {startItem}–{endItem} of {totalItems} items
      </span>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Numbered pages */}
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8 text-xs"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}

        {/* Next */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Glasses Frame/Lens Modal (unchanged) ───────────────────────────────────
const glassesSchema = z.object({
  name: z.string().min(1), brand: z.string().optional(), frameType: z.string().optional(),
  lensType: z.string().optional(), color: z.string().optional(),
  price: z.coerce.number().min(0.01), quantity: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0).optional(), description: z.string().optional(),
});
type GlassesForm = z.infer<typeof glassesSchema>;

function GlassesFormModal({ glasses, trigger }: { glasses?: Glasses; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useCreateGlasses(); const update = useUpdateGlasses();
  const def = (g?: Glasses): GlassesForm => g
    ? { name: g.name, brand: g.brand ?? "", frameType: g.frameType ?? "", lensType: g.lensType ?? "", color: g.color ?? "", price: g.price, quantity: g.quantity, lowStockThreshold: g.lowStockThreshold, description: g.description ?? "" }
    : { name: "", brand: "", frameType: "", lensType: "", color: "", price: 0, quantity: 0, lowStockThreshold: 5, description: "" };
  const form = useForm<GlassesForm>({ resolver: zodResolver(glassesSchema) as Resolver<GlassesForm>, defaultValues: def(glasses) });
  const onOpenChange = (v: boolean) => { setOpen(v); if (v) form.reset(def(glasses)); };
  const onSubmit = (values: GlassesForm) => {
    const payload: GlassesInput = { ...values, price: Number(values.price), quantity: Number(values.quantity) };
    if (glasses) update.mutate({ id: glasses.id, data: payload }, { onSuccess: () => { toast({ title: "Glasses updated." }); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }) });
    else create.mutate(payload, { onSuccess: () => { toast({ title: "Glasses added." }); form.reset(def()); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="mr-2 h-4 w-4" />Add Glasses</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader><DialogTitle>{glasses ? "Edit Glasses" : "Add Glasses"}</DialogTitle></DialogHeader>
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
              <Button type="submit" disabled={create.isPending || update.isPending}>{glasses ? "Save Changes" : "Add Glasses"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Accessory Modal (unchanged) ────────────────────────────────────────────
const accSchema = z.object({
  name: z.string().min(1), accessoryType: z.string().min(1),
  price: z.coerce.number().min(0.01), quantity: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0).optional(), description: z.string().optional(),
});
type AccForm = z.infer<typeof accSchema>;

function AccessoryModal({ item, trigger }: { item?: GlassesAccessory; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useCreateGlassesAccessory(); const update = useUpdateGlassesAccessory();
  const def = (a?: GlassesAccessory): AccForm => a
    ? { name: a.name, accessoryType: a.accessoryType, price: a.price, quantity: a.quantity, lowStockThreshold: a.lowStockThreshold, description: a.description ?? "" }
    : { name: "", accessoryType: "", price: 0, quantity: 0, lowStockThreshold: 5, description: "" };
  const form = useForm<AccForm>({ resolver: zodResolver(accSchema) as Resolver<AccForm>, defaultValues: def(item) });
  const onOpenChange = (v: boolean) => { setOpen(v); if (v) form.reset(def(item)); };
  const onSubmit = (values: AccForm) => {
    const payload: GlassesAccessoryInput = { ...values, price: Number(values.price), quantity: Number(values.quantity) };
    if (item) update.mutate({ id: item.id, data: payload }, { onSuccess: () => { toast({ title: "Accessory updated." }); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }) });
    else create.mutate(payload, { onSuccess: () => { toast({ title: "Accessory added." }); form.reset(def()); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="mr-2 h-4 w-4" />Add Accessory</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{item ? "Edit Accessory" : "Add Accessory"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="accessoryType" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(ACCESSORY_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price (₦)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (<FormItem><FormLabel>Alert At</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>{item ? "Save Changes" : "Add Accessory"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Repair Modal (unchanged) ───────────────────────────────────────────────
const repairSchema = z.object({
  name: z.string().min(1), description: z.string().optional(),
  price: z.coerce.number().min(0.01), active: z.boolean().optional(),
});
type RepairForm = z.infer<typeof repairSchema>;

function RepairModal({ item, trigger }: { item?: GlassesRepair; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useCreateGlassesRepair(); const update = useUpdateGlassesRepair();
  const def = (r?: GlassesRepair): RepairForm => r
    ? { name: r.name, description: r.description ?? "", price: r.price, active: r.active }
    : { name: "", description: "", price: 0, active: true };
  const form = useForm<RepairForm>({ resolver: zodResolver(repairSchema) as Resolver<RepairForm>, defaultValues: def(item) });
  const onOpenChange = (v: boolean) => { setOpen(v); if (v) form.reset(def(item)); };
  const onSubmit = (values: RepairForm) => {
    const payload: GlassesRepairInput = { ...values, price: Number(values.price) };
    if (item) update.mutate({ id: item.id, data: payload }, { onSuccess: () => { toast({ title: "Repair service updated." }); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }) });
    else create.mutate(payload, { onSuccess: () => { toast({ title: "Repair service added." }); form.reset(def()); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }) });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="mr-2 h-4 w-4" />Add Repair Service</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{item ? "Edit Repair Service" : "Add Repair Service"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Service Name</FormLabel><FormControl><Input placeholder="e.g. Frame Adjustment, Lens Replacement…" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price (₦)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>{item ? "Save Changes" : "Add Service"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function GlassesPage() {
  const [activeTab, setActiveTab] = useState<GlassesTab>("FRAMES");
  const [search, setSearch]       = useState("");

  // ── ADDED: One page-state per tab so they are independent ─────────────
  const [framesPage,      setFramesPage]      = useState(1);
  const [accessoriesPage, setAccessoriesPage] = useState(1);
  const [repairsPage,     setRepairsPage]     = useState(1);

  const { toast } = useToast();

  const { data: glasses,     isLoading: loadingGlasses }  = useGetGlasses({ search: search || undefined }, { enabled: activeTab === "FRAMES" });
  const { data: accessories, isLoading: loadingAcc }       = useGetGlassesAccessories({ search: search || undefined }, { enabled: activeTab === "ACCESSORIES" });
  const { data: repairs,     isLoading: loadingRepairs }   = useGetGlassesRepairs({ enabled: activeTab === "REPAIRS" });

  const deleteGlasses = useDeleteGlasses();
  const deleteAcc     = useDeleteGlassesAccessory();
  const deleteRepair  = useDeleteGlassesRepair();

  // ── ADDED: Sort + paginate helpers ────────────────────────────────────
  const sortedGlasses     = glasses     ? sortByName(glasses)     : [];
  const sortedAccessories = accessories ? sortByName(accessories) : [];
  const sortedRepairs     = repairs     ? sortByName(repairs)     : [];

  const glassesPaged     = sortedGlasses.slice((framesPage - 1)      * ITEMS_PER_PAGE, framesPage      * ITEMS_PER_PAGE);
  const accessoriesPaged = sortedAccessories.slice((accessoriesPage - 1) * ITEMS_PER_PAGE, accessoriesPage * ITEMS_PER_PAGE);
  const repairsPaged     = sortedRepairs.slice((repairsPage - 1)     * ITEMS_PER_PAGE, repairsPage     * ITEMS_PER_PAGE);

  const totalFramesPages      = Math.ceil(sortedGlasses.length     / ITEMS_PER_PAGE);
  const totalAccessoriesPages = Math.ceil(sortedAccessories.length / ITEMS_PER_PAGE);
  const totalRepairsPages     = Math.ceil(sortedRepairs.length     / ITEMS_PER_PAGE);

  const tabs: { value: GlassesTab; label: string }[] = [
    { value: "FRAMES",      label: "Frames & Lenses" },
    { value: "ACCESSORIES", label: "Accessories" },
    { value: "REPAIRS",     label: "Repair Services" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Glasses & Eyewear</h1>
          <p className="text-muted-foreground mt-1">Manage frames, accessories, and repair services.</p>
        </div>
        {activeTab === "FRAMES"      && <GlassesFormModal />}
        {activeTab === "ACCESSORIES" && <AccessoryModal />}
        {activeTab === "REPAIRS"     && <RepairModal />}
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="py-3 px-4 border-b border-border bg-muted/20 space-y-3">
          <div className="flex gap-1.5">
            {tabs.map(t => (
              <button
                key={t.value}
                onClick={() => {
                  setActiveTab(t.value);
                  setSearch("");
                  // ── ADDED: reset the relevant page on tab switch ──────
                  setFramesPage(1);
                  setAccessoriesPage(1);
                  setRepairsPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  activeTab === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {activeTab !== "REPAIRS" && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-background"
                placeholder="Search…"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  // ── ADDED: reset page on new search so we start at page 1
                  setFramesPage(1);
                  setAccessoriesPage(1);
                }}
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">

          {/* ── FRAMES TAB ── */}
          {activeTab === "FRAMES" && (
            <>
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
                  {loadingGlasses
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    // ── CHANGED: iterate glassesPaged (sorted + sliced) instead of glasses ──
                    : glassesPaged.length > 0
                      ? glassesPaged.map(g => (
                          <TableRow key={g.id} className="hover:bg-muted/10">
                            <TableCell className="pl-6 font-medium">{g.name}</TableCell>
                            <TableCell className="text-muted-foreground">{g.brand ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {[g.frameType, g.lensType].filter(Boolean).join(" / ") || "—"}
                            </TableCell>
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
                                      <AlertDialogDescription>Permanently removes this item.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteGlasses.mutate(g.id, {
                                          onSuccess: () => toast({ title: `${g.name} deleted.` }),
                                          onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
                                        })}
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
                      : (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                              {search ? `No glasses matching "${search}".` : "No glasses yet."}
                            </TableCell>
                          </TableRow>
                        )
                  }
                </TableBody>
              </Table>

              {/* ── ADDED: Frames pagination bar ── */}
              {!loadingGlasses && (
                <PaginationControls
                  currentPage={framesPage}
                  totalPages={totalFramesPages}
                  onPageChange={setFramesPage}
                  totalItems={sortedGlasses.length}
                />
              )}
            </>
          )}

          {/* ── ACCESSORIES TAB ── */}
          {activeTab === "ACCESSORIES" && (
            <>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingAcc
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    // ── CHANGED: iterate accessoriesPaged instead of accessories ──
                    : accessoriesPaged.length > 0
                      ? accessoriesPaged.map(a => (
                          <TableRow key={a.id} className="hover:bg-muted/10">
                            <TableCell className="pl-6 font-medium">{a.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={ACCESSORY_COLORS[a.accessoryType] ?? ""}>
                                {ACCESSORY_TYPE_LABELS[a.accessoryType] ?? a.accessoryType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">₦{Number(a.price).toFixed(2)}</TableCell>
                            <TableCell className="text-right font-mono">{a.quantity}</TableCell>
                            <TableCell>
                              {a.lowStock
                                ? <Badge variant="destructive">Low Stock</Badge>
                                : <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">In Stock</Badge>}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex justify-end gap-1">
                                <AccessoryModal item={a} trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-muted-foreground" /></Button>} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete {a.name}?</AlertDialogTitle>
                                      <AlertDialogDescription>Permanently removes this accessory.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAcc.mutate(a.id, {
                                          onSuccess: () => toast({ title: `${a.name} deleted.` }),
                                          onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
                                        })}
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
                      : (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                              No accessories yet.
                            </TableCell>
                          </TableRow>
                        )
                  }
                </TableBody>
              </Table>

              {/* ── ADDED: Accessories pagination bar ── */}
              {!loadingAcc && (
                <PaginationControls
                  currentPage={accessoriesPage}
                  totalPages={totalAccessoriesPages}
                  onPageChange={setAccessoriesPage}
                  totalItems={sortedAccessories.length}
                />
              )}
            </>
          )}

          {/* ── REPAIRS TAB ── */}
          {activeTab === "REPAIRS" && (
            <>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="pl-6">Service Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRepairs
                    ? Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    // ── CHANGED: iterate repairsPaged instead of repairs ──
                    : repairsPaged.length > 0
                      ? repairsPaged.map(r => (
                          <TableRow key={r.id} className="hover:bg-muted/10">
                            <TableCell className="pl-6 font-medium">{r.name}</TableCell>
                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                              {r.description || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">₦{Number(r.price).toFixed(2)}</TableCell>
                            <TableCell>
                              {r.active
                                ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                                : <Badge variant="outline" className="bg-muted text-muted-foreground">Inactive</Badge>}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <div className="flex justify-end gap-1">
                                <RepairModal item={r} trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-muted-foreground" /></Button>} />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Deactivate {r.name}?</AlertDialogTitle>
                                      <AlertDialogDescription>Hides this service from new sales. History preserved.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteRepair.mutate(r.id, {
                                          onSuccess: () => toast({ title: `${r.name} deactivated.` }),
                                          onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
                                        })}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Deactivate
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              No repair services yet.
                            </TableCell>
                          </TableRow>
                        )
                  }
                </TableBody>
              </Table>

              {/* ── ADDED: Repairs pagination bar ── */}
              {!loadingRepairs && (
                <PaginationControls
                  currentPage={repairsPage}
                  totalPages={totalRepairsPages}
                  onPageChange={setRepairsPage}
                  totalItems={sortedRepairs.length}
                />
              )}
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}