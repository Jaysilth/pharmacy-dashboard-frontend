import { useState } from "react";
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
} from "@/lib/queries";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { Consumable, ConsumableInput } from "@/types/api";
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
import { Plus, Edit, Trash2, Search, Package, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type PageTab = "STOCK" | "USAGE_LOG";

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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConsumablesPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("STOCK");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();

  const { data: consumables, isLoading } = useGetConsumables(
    { search: search || undefined },
    { enabled: activeTab === "STOCK" },
  );
  const { data: usageLog, isLoading: loadingLog } = useGetConsumableUsage();
  const deleteConsumable = useDeleteConsumable();
  const deleteUsage = useDeleteConsumableUsage();
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Consumables</h1>
          <p className="text-muted-foreground mt-1">
            Internal medical supplies — tracked by usage, not sold.
          </p>
        </div>
        {activeTab === "STOCK" && <ConsumableModal />}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {[
          { value: "STOCK",     label: "Stock",     icon: Package },
          { value: "USAGE_LOG", label: "Usage Log", icon: History },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value as PageTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors",
              activeTab === t.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border text-muted-foreground hover:bg-muted/50",
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <Card className="shadow-sm border-border">
        {activeTab === "STOCK" && (
          <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 bg-background"
                placeholder="Search consumables…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
        )}

        <CardContent className="p-0 overflow-x-auto">

          {/* ── STOCK TAB ── */}
          {activeTab === "STOCK" && (
            <Table>
              <TableHeader className="bg-muted/30">
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
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : consumables && consumables.length > 0 ? (
                  consumables.map(c => (
                    <TableRow key={c.id} className="hover:bg-muted/10">
                      <TableCell className="pl-6 font-medium">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.unit}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[180px] truncate">
                        {c.description || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {c.quantityInStock}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {c.reorderLevel}
                      </TableCell>
                      <TableCell>
                        {c.lowStock ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        
                          <div className="flex justify-end gap-1">
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
                                  <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This removes the consumable and its usage history. Cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteConsumable.mutate(c.id, {
                                        onSuccess: () => toast({ title: `${c.name} deleted.` }),
                                        onError: e =>
                                          toast({
                                            title: "Delete failed",
                                            description: e instanceof ApiError ? e.message : String(e),
                                            variant: "destructive",
                                          }),
                                      })
                                    }
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {search ? `No consumables matching "${search}".` : "No consumables yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {/* ── USAGE LOG TAB ── */}
          {activeTab === "USAGE_LOG" && (
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="pl-6">Consumable</TableHead>
                  <TableHead className="text-right">Qty Used</TableHead>
                  <TableHead>Used By</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="pr-6">Date</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingLog ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : usageLog && usageLog.length > 0 ? (
                  usageLog.map(u => (
                    <TableRow key={u.id} className="hover:bg-muted/10">
                      <TableCell className="pl-6 font-medium">{u.consumableName}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {u.quantityUsed} <span className="text-xs text-muted-foreground">{u.unit}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.usedBy || "—"}</TableCell>
                      <TableCell>
                        {u.linkedEntityType ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] w-fit",
                                u.linkedEntityType === "SURGERY"   && "bg-rose-50 text-rose-700 border-rose-200",
                                u.linkedEntityType === "PROCEDURE" && "bg-indigo-50 text-indigo-700 border-indigo-200",
                                u.linkedEntityType === "LAB_TEST"  && "bg-amber-50 text-amber-700 border-amber-200",
                              )}
                            >
                              {u.linkedEntityType.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {u.surgeryName ?? u.procedureRef ?? u.labTestRef ?? ""}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[140px] truncate">
                        {u.notes || "—"}
                      </TableCell>
                      <TableCell className="pr-6 text-sm text-muted-foreground">
                        {format(new Date(u.usedAt), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {isSuperAdmin ? (
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
                                <AlertDialogTitle>Delete this usage entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {u.quantityUsed} {u.unit} of {u.consumableName} will be added back to stock,
                                  and this log entry will be permanently removed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    deleteUsage.mutate(u.id, {
                                      onSuccess: () => toast({ title: "Usage entry deleted, stock restored." }),
                                      onError: e =>
                                        toast({
                                          title: "Delete failed",
                                          description: e instanceof ApiError ? e.message : String(e),
                                          variant: "destructive",
                                        }),
                                    })
                                  }
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No usage recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}