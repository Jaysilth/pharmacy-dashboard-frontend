import { useState, Fragment } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import {
  useGetConsumables,
  useCreateConsumable,
  useUpdateConsumable,
  useDeleteConsumable,
  useGetConsumableUsage,
  useDeleteConsumableUsage,
  useGetIols,
  useDeleteIol,
  useGetIolUsage,
  useDeleteIolUsage,
} from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { Consumable, ConsumableInput, ConsumableUsageRecord } from "@/types/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, Package, History, Syringe, ChevronDown, ChevronRight } from "lucide-react";
import { ExportButton } from "@/components/export-button";
import { exportToExcel } from "@/lib/export-excel";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { IolModal } from "@/components/IolModal";
import { IolUsageModal } from "@/components/IolUsageModal";
import { ConsumableUsageModal } from "@/components/ConsumableUsageModal";

type PageTab = "STOCK" | "USAGE_LOG" | "IOL" | "IOL_USAGE";

const IOL_TYPES = [
  { value: "",         label: "All" },
  { value: "RIGID",    label: "Rigid" },
  { value: "FOLDABLE", label: "Foldable" },
];

const schema = z.object({
  name:            z.string().min(1, "Name is required"),
  description:     z.string().optional(),
  unit:            z.string().min(1, "Unit is required (e.g. pieces, ml)"),
  quantityInStock: z.coerce.number().min(0),
  reorderLevel:    z.coerce.number().min(0).optional(),
});
type ConsumableForm = z.infer<typeof schema>;

// ── Form modal ────────────────────────────────────────────────────────────────

function ConsumableModal({
  item,
  trigger,
}: {
  item?: Consumable;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useCreateConsumable();
  const update = useUpdateConsumable();

  const def = (c?: Consumable): ConsumableForm => c
    ? {
        name:            c.name,
        description:     c.description ?? "",
        unit:            c.unit,
        quantityInStock: c.quantityInStock,
        reorderLevel:    c.reorderLevel,
      }
    : { name: "", description: "", unit: "", quantityInStock: 0, reorderLevel: 5 };

  const form = useForm<ConsumableForm>({
    resolver: zodResolver(schema) as Resolver<ConsumableForm>,
    defaultValues: def(item),
  });

  const onOpenChange = (v: boolean) => { setOpen(v); if (v) form.reset(def(item)); };

  const onSubmit = (values: ConsumableForm) => {
    const payload: ConsumableInput = {
      ...values,
      quantityInStock: Number(values.quantityInStock),
      reorderLevel:    Number(values.reorderLevel ?? 5),
    };
    if (item) {
      update.mutate({ id: item.id, data: payload }, {
        onSuccess: () => { toast({ title: "Consumable updated." }); setOpen(false); },
        onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast({ title: "Consumable added." }); form.reset(def()); setOpen(false); },
        onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
      });
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Consumable
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Consumable" : "Add Consumable"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="e.g. Surgical Gloves, Syringe 5ml…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="unit" render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <FormControl><Input placeholder="pairs, pieces, ml, boxes…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantityInStock" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity in Stock</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reorderLevel" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Level</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {item ? "Save Changes" : "Add Consumable"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ONLY showing the updated main page (modal stays unchanged)

export default function ConsumablesPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("STOCK");
  const [search, setSearch] = useState("");
  const [activeIolType, setActiveIolType] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const { data: consumables, isLoading } = useGetConsumables(
    { search: search || undefined },
    { enabled: activeTab === "STOCK" },
  );

  const { data: usageLog, isLoading: loadingLog } = useGetConsumableUsage();

  const { data: iols, isLoading: loadingIols } = useGetIols(
    { search: search || undefined },
    { enabled: activeTab === "IOL" },
  );
  const { data: iolUsageLog, isLoading: loadingIolLog } = useGetIolUsage();

  const deleteConsumable = useDeleteConsumable();
  const deleteUsage = useDeleteConsumableUsage();
  const deleteIol = useDeleteIol();
  const deleteIolUsage = useDeleteIolUsage();

  const filteredIols = iols?.filter(i =>
    !activeIolType || i.type === activeIolType
  ) ?? [];

  // Usage log entries carry no shared "session" id, so items recorded together
  // in one ConsumableUsageModal submission are grouped here by the closest
  // proxy available: same person + same linked target + same calendar day.
  // This keeps the table to one row per encounter instead of one row per
  // consumable, without needing a backend change.
  type UsageGroup = {
    key: string;
    usedBy: string;
    linkedLabel: string;
    date: string;
    items: ConsumableUsageRecord[];
  };

  const usageGroups: UsageGroup[] = (() => {
    if (!usageLog) return [];
    const map = new Map<string, UsageGroup>();
    for (const u of usageLog) {
      const dateKey = format(new Date(u.usedAt), "yyyy-MM-dd");
      const linkedLabel = u.surgeryName || u.procedureRef || u.labTestRef || "—";
      const usedByLabel = u.usedBy || "Unspecified";
      const key = `${usedByLabel}__${linkedLabel}__${dateKey}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(u);
      } else {
        map.set(key, { key, usedBy: usedByLabel, linkedLabel, date: u.usedAt, items: [u] });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  })();

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consumables</h1>
          <p className="text-muted-foreground mt-1">
            Internal medical supplies — tracked by usage, not sold.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExportButton
            testId="button-export-consumables"
            onExport={() => {
              if (activeTab === "STOCK") {
                exportToExcel(
                  "consumables-stock",
                  (consumables ?? []).map(c => ({
                    Name: c.name,
                    Unit: c.unit,
                    "Quantity in Stock": c.quantityInStock,
                    "Reorder Level": c.reorderLevel,
                    "Low Stock": c.lowStock ? "Yes" : "No",
                  }))
                );
              } else if (activeTab === "USAGE_LOG") {
                exportToExcel(
                  "consumables-usage-log",
                  (usageLog ?? []).map(u => ({
                    Consumable: u.consumableName,
                    Unit: u.unit,
                    "Quantity Used": u.quantityUsed,
                    "Used By": u.usedBy ?? "",
                    "Linked Surgery": u.surgeryName ?? u.procedureRef ?? u.labTestRef ?? "",
                    "Used At": u.usedAt,
                    Notes: u.notes ?? "",
                  }))
                );
              } else if (activeTab === "IOL") {
                exportToExcel(
                  "iol-stock",
                  (filteredIols ?? []).map(i => ({
                    Name: i.name,
                    Type: i.type,
                    Power: i.power,
                    Manufacturer: i.manufacturer ?? "",
                    "Quantity in Stock": i.quantityInStock,
                    "Reorder Level": i.reorderLevel,
                    "Low Stock": i.lowStock ? "Yes" : "No",
                  }))
                );
              } else {
                exportToExcel(
                  "iol-usage-log",
                  (iolUsageLog ?? []).map(u => ({
                    IOL: u.iolName,
                    Power: u.iolPower,
                    "Quantity Used": u.quantityUsed,
                    Surgery: u.surgeryName,
                    "Used By": u.usedBy ?? "",
                    "Used At": u.usedAt,
                    Notes: u.notes ?? "",
                  }))
                );
              }
            }}
          />
          {activeTab === "STOCK" && <ConsumableModal />}
          {activeTab === "USAGE_LOG" && <ConsumableUsageModal />}
          {activeTab === "IOL" && <IolModal />}
          {activeTab === "IOL_USAGE" && <IolUsageModal />}
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "STOCK", label: "Stock", icon: Package },
          { value: "USAGE_LOG", label: "Usage Log", icon: History },
          { value: "IOL", label: "IOLs", icon: Package },
          { value: "IOL_USAGE", label: "IOL Usage", icon: Syringe },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value as PageTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
              activeTab === t.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-background border-border text-muted-foreground hover:bg-muted/50"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <Card className="shadow-sm border-border overflow-hidden">

        {/* SEARCH */}
        {(activeTab === "STOCK" || activeTab === "IOL") && (
          <CardHeader className="py-3 px-4 border-b bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={activeTab === "IOL" ? "Search IOLs…" : "Search consumables…"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {activeTab === "IOL" && (
              <div className="flex gap-1.5 flex-wrap">
                {IOL_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setActiveIolType(t.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-colors border",
                      activeIolType === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {t.label}
                    {t.value !== "" && iols && (
                      <span className="ml-1.5 opacity-60">
                        ({iols.filter(i => i.type === t.value).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
        )}

        <CardContent className="p-0 overflow-x-auto">
          <Table className="text-sm">

            {/* ================= STOCK TAB ================= */}
            {activeTab === "STOCK" && (
              <>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Reorder At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="h-14">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : consumables && consumables.length > 0 ? (
                    consumables.map((c) => (
                      <TableRow
                        key={c.id}
                        className="hover:bg-muted/10 h-14 [&>td]:align-middle"
                      >
                        <TableCell className="pl-6 font-medium">
                          {c.name}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {c.unit}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm max-w-[180px] truncate">
                          {c.description || "—"}
                        </TableCell>

                        <TableCell className="text-right font-mono tabular-nums font-semibold">
                          {c.quantityInStock}
                        </TableCell>

                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {c.reorderLevel}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center">
                            {c.lowStock ? (
                              <Badge variant="destructive">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-primary/10 text-primary border-primary/20"
                              >
                                OK
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* FIXED ACTION COLUMN */}
                        <TableCell className="text-right pr-6">
                          {isSuperAdmin ? (
                            <div className="flex justify-end items-center gap-2">
                              <ConsumableModal
                                item={c}
                                trigger={
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                }
                              />

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete {c.name}?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This removes the consumable and its usage history.
                                      Cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>

                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteConsumable.mutate(c.id, {
                                          onSuccess: () =>
                                            toast({
                                              title: `${c.name} deleted.`,
                                            }),
                                          onError: (e) =>
                                            toast({
                                              title: "Delete failed",
                                              description:
                                                e instanceof ApiError
                                                  ? e.message
                                                  : String(e),
                                              variant: "destructive",
                                            }),
                                        })
                                      }
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-32 text-center text-muted-foreground"
                      >
                        {search
                          ? `No consumables matching "${search}".`
                          : "No consumables yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </>
            )}

            {/* ================= USAGE LOG TAB ================= */}
            {/* Grouped by person + linked target + day, since usage entries recorded
                together in one modal submission share no batch/session id from the
                backend. Click a row (or "View") to expand the individual items. */}
            {activeTab === "USAGE_LOG" && (
              <>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Used By</TableHead>
                    <TableHead>Linked To</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Qty</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingLog ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="h-14">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : usageGroups.length > 0 ? (
                    usageGroups.map((g) => {
                      const isExpanded = expandedGroups.has(g.key);
                      const totalQty = g.items.reduce((sum, it) => sum + it.quantityUsed, 0);
                      return (
                        <Fragment key={g.key}>
                          <TableRow className="hover:bg-muted/10 h-14 [&>td]:align-middle">
                            <TableCell className="pl-6">
                              <button
                                onClick={() => toggleGroup(g.key)}
                                className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                              >
                                {isExpanded
                                  ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                {g.usedBy}
                              </button>
                            </TableCell>

                            <TableCell className="text-muted-foreground">
                              {g.linkedLabel}
                            </TableCell>

                            <TableCell className="text-right">
                              <Badge variant="outline">
                                {g.items.length} item{g.items.length !== 1 ? "s" : ""}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right font-mono tabular-nums font-semibold">
                              {totalQty}
                            </TableCell>

                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(g.date), "dd MMM yyyy")}
                            </TableCell>

                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="sm" onClick={() => toggleGroup(g.key)}>
                                {isExpanded ? "Hide" : "View"}
                              </Button>
                            </TableCell>
                          </TableRow>

                          {isExpanded && (
                            <TableRow className="bg-muted/10 hover:bg-muted/10">
                              <TableCell colSpan={6} className="py-3 px-6">
                                <div className="space-y-1.5">
                                  {g.items.map((u) => (
                                    <div
                                      key={u.id}
                                      className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg bg-background border border-border/60"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-sm font-medium truncate">{u.consumableName}</span>
                                        <span className="text-xs text-muted-foreground font-mono shrink-0">
                                          {u.quantityUsed} {u.unit}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0">
                                        {u.notes && (
                                          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                            {u.notes}
                                          </span>
                                        )}
                                        {isSuperAdmin && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                            onClick={() =>
                                              deleteUsage.mutate(u.id, {
                                                onSuccess: () => toast({ title: "Usage entry deleted." }),
                                                onError: (e) => toast({
                                                  title: "Delete failed",
                                                  description: e instanceof ApiError ? e.message : String(e),
                                                  variant: "destructive",
                                                }),
                                              })
                                            }
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No usage recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </>
            )}

            {/* ================= IOL STOCK TAB ================= */}
            {activeTab === "IOL" && (
              <>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Power (D)</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">Reorder At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingIols ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="h-14">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredIols.length > 0 ? (
                    filteredIols.map((i) => (
                      <TableRow
                        key={i.id}
                        className="hover:bg-muted/10 h-14 [&>td]:align-middle"
                      >
                        <TableCell className="pl-6 font-medium">{i.name}</TableCell>

                        <TableCell>
                          <Badge variant="outline">
                            {i.type === "RIGID" ? "Rigid" : "Foldable"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right font-mono tabular-nums">
                          {i.power.toFixed(2)}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {i.manufacturer || "—"}
                        </TableCell>

                        <TableCell className="text-right font-mono tabular-nums font-semibold">
                          {i.quantityInStock}
                        </TableCell>

                        <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                          {i.reorderLevel}
                        </TableCell>

                        <TableCell>
                          {i.lowStock ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                              OK
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          {isSuperAdmin ? (
                            <div className="flex justify-end items-center gap-2">
                              <IolModal
                                item={i}
                                trigger={
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4 text-muted-foreground" />
                                  </Button>
                                }
                              />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete {i.name} ({i.power}D)?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This removes this IOL stock row and its usage history. Cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        deleteIol.mutate(i.id, {
                                          onSuccess: () => toast({ title: `${i.name} deleted.` }),
                                          onError: (e) => toast({
                                            title: "Delete failed",
                                            description: e instanceof ApiError ? e.message : String(e),
                                            variant: "destructive",
                                          }),
                                        })
                                      }
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        {search
                          ? `No IOLs matching "${search}".`
                          : activeIolType
                          ? `No ${IOL_TYPES.find(t => t.value === activeIolType)?.label} IOLs in stock.`
                          : "No IOLs in stock yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </>
            )}

            {/* ================= IOL USAGE LOG TAB ================= */}
            {activeTab === "IOL_USAGE" && (
              <>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="pl-6">IOL</TableHead>
                    <TableHead className="text-right">Power (D)</TableHead>
                    <TableHead className="text-right">Qty Used</TableHead>
                    <TableHead>Surgery</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {loadingIolLog ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="h-14">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-5 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : iolUsageLog && iolUsageLog.length > 0 ? (
                    iolUsageLog.map((u) => (
                      <TableRow key={u.id} className="hover:bg-muted/10 h-14 [&>td]:align-middle">
                        <TableCell className="pl-6 font-medium">{u.iolName}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">{u.iolPower.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-semibold">{u.quantityUsed}</TableCell>
                        <TableCell className="text-muted-foreground">{u.surgeryName}</TableCell>
                        <TableCell className="text-muted-foreground">{u.usedBy || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm truncate max-w-[140px]">{u.notes || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(u.usedAt), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {isSuperAdmin ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() =>
                                deleteIolUsage.mutate(u.id, {
                                  onSuccess: () => toast({ title: "Usage entry deleted." }),
                                  onError: (e) => toast({
                                    title: "Delete failed",
                                    description: e instanceof ApiError ? e.message : String(e),
                                    variant: "destructive",
                                  }),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                        No IOL usage recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </>
            )}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}