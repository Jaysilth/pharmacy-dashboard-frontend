import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import {
  useCreateMedicine,
  useUpdateMedicine,
  useGetMedicines,
  checkMedicineBatch,
} from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertTriangle, Layers, GitBranch, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Medicine, BatchCheckResult } from "@/types/api";

// ── Categories ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "EYEDROP",   label: "Eye Drop" },
  { value: "TABLET",    label: "Tablet" },
  { value: "INJECTION", label: "Injection" },
  { value: "SYRUP",     label: "Syrup" },
] as const;

// ── Form schema ───────────────────────────────────────────────────────────────

const medicineSchema = z.object({
  name:              z.string().min(1, "Name is required"),
  category:          z.string().min(1, "Category is required"),
  quantity:          z.coerce.number().min(0, "Must be 0 or more"),
  price:             z.coerce.number().min(0.01, "Price must be greater than 0"),
  expiryDate:        z.string().min(1, "Expiry date is required"),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  description:       z.string().optional(),
  manufacturer:      z.string().optional(),
});

type MedicineForm = z.infer<typeof medicineSchema>;

// ── Step type ─────────────────────────────────────────────────────────────────

type Step =
  | "FORM"               // normal add/edit form
  | "EXACT_MATCH"        // same price+expiry found — confirm qty merge
  | "BATCH_CONFLICT"     // different price/expiry — choose: update or new
  | "SELECT_BATCH";      // choose which existing batch to update

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  medicine?: Medicine;
  trigger?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MedicineFormModal({ medicine, trigger }: Props) {
  const [open, setOpen]         = useState(false);
  const [step, setStep]         = useState<Step>("FORM");
  const [batchCheck, setBatchCheck] = useState<BatchCheckResult | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [pendingValues, setPendingValues] = useState<MedicineForm | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const { toast } = useToast();
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();

  const emptyDefaults: MedicineForm = {
    name: "", category: "", quantity: 0, price: 0,
    expiryDate: format(new Date(), "yyyy-MM-dd"),
    lowStockThreshold: 10, description: "", manufacturer: "",
  };

  const editDefaults = (m: Medicine): MedicineForm => ({
    name:              m.name,
    category:          m.category ?? "",
    quantity:          m.quantity,
    price:             Number(m.price),
    expiryDate:        m.expiryDate.split("T")[0],
    lowStockThreshold: m.lowStockThreshold,
    description:       m.description ?? "",
    manufacturer:      m.manufacturer ?? "",
  });

  const form = useForm<MedicineForm>({
    resolver: zodResolver(medicineSchema) as Resolver<MedicineForm>,
    defaultValues: medicine ? editDefaults(medicine) : emptyDefaults,
  });

  // ── Reset everything on open/close ────────────────────────────────────────

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setStep("FORM");
      setBatchCheck(null);
      setSelectedBatchId(null);
      setPendingValues(null);
      form.reset(medicine ? editDefaults(medicine) : emptyDefaults);
    }
  };

  // ── Submit helpers ────────────────────────────────────────────────────────

  const doCreate = (values: MedicineForm, batchAction?: string, targetBatchId?: number) => {
    createMedicine.mutate(
      {
        ...values,
        price: Number(values.price),
        quantity: Number(values.quantity),
        batchAction,
        targetBatchId,
      } as Parameters<typeof createMedicine.mutate>[0],
      {
        onSuccess: () => {
          toast({ title: "Medicine added." });
          setOpen(false);
        },
        onError: (err) =>
          toast({ title: "Failed", description: String(err), variant: "destructive" }),
      },
    );
  };

  const doUpdate = (values: MedicineForm) => {
    if (!medicine) return;
    updateMedicine.mutate(
      { id: medicine.id, data: { ...values, price: Number(values.price) } },
      {
        onSuccess: () => { toast({ title: "Medicine updated." }); setOpen(false); },
        onError:   (err) =>
          toast({ title: "Update failed", description: String(err), variant: "destructive" }),
      },
    );
  };

  // ── Main form submission ──────────────────────────────────────────────────

  const onSubmit = async (values: MedicineForm) => {
    // Edit mode: no batch logic needed
    if (medicine) {
      doUpdate(values);
      return;
    }

    setIsChecking(true);
    try {
      const result = await checkMedicineBatch(values.name, values.price, values.expiryDate);
      setBatchCheck(result);
      setPendingValues(values);

      if (result.status === "NO_MATCH") {
        // Brand new drug — create with Batch A automatically
        doCreate(values, "AUTO");
      } else if (result.status === "EXACT_MATCH") {
        // Same price + expiry — show merge confirmation
        setStep("EXACT_MATCH");
      } else {
        // Same name, different price/expiry — need user decision
        setStep("BATCH_CONFLICT");
      }
    } catch {
      // If the check itself fails (network issue), fall back to auto-create
      toast({
        title: "Warning",
        description: "Could not verify existing batches. Creating as new entry.",
      });
      doCreate(values, "AUTO");
    } finally {
      setIsChecking(false);
    }
  };

  // ── Rendered step bodies ──────────────────────────────────────────────────

  const isPending = createMedicine.isPending || updateMedicine.isPending;

  // ── STEP: Normal form ─────────────────────────────────────────────────────

  const FormStep = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Medicine Name</FormLabel>
            <FormControl><Input {...field} data-testid="input-medicine-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ""}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="quantity" render={({ field }) => (
            <FormItem>
              <FormLabel>Stock Quantity</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price (₦)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="expiryDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Expiry Date</FormLabel>
              <FormControl><Input type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
            <FormItem>
              <FormLabel>Low Stock Alert At</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="manufacturer" render={({ field }) => (
          <FormItem>
            <FormLabel>Manufacturer (optional)</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description (optional)</FormLabel>
            <FormControl><Textarea {...field} className="resize-none" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={isPending || isChecking}>
            {isChecking ? "Checking…" : medicine ? "Save Changes" : "Add Medicine"}
          </Button>
        </div>
      </form>
    </Form>
  );

  // ── STEP: Exact match — same price + expiry ───────────────────────────────

  const ExactMatchStep = () => {
    if (!batchCheck || !pendingValues) return null;
    const matchLabel = batchCheck.exactMatchBatchLabel ?? "?";

    return (
      <div className="space-y-5 pt-2">
        <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/30 bg-primary/5">
          <RefreshCw className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-foreground">
              Batch {matchLabel} already has this price and expiry.
            </p>
            <p className="text-muted-foreground">
              <span className="font-mono font-medium text-foreground">
                {pendingValues.quantity} units
              </span>{" "}
              will be added to <span className="font-medium">Batch {matchLabel}</span>. No new batch is created.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Batch</span>
            <span className="font-medium">{matchLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price</span>
            <span className="font-mono">₦{Number(pendingValues.price).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Expiry</span>
            <span>{pendingValues.expiryDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adding</span>
            <span className="font-mono text-primary font-semibold">+{pendingValues.quantity} units</span>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => setStep("FORM")}>Back</Button>
          <Button
            disabled={isPending}
            onClick={() => doCreate(pendingValues, "AUTO")}
          >
            {isPending ? "Saving…" : `Confirm — Add to Batch ${matchLabel}`}
          </Button>
        </div>
      </div>
    );
  };

  // ── STEP: Name conflict — ask user for intent ─────────────────────────────

  const BatchConflictStep = () => {
    if (!batchCheck || !pendingValues) return null;
    const nextLabel =
      batchCheck.existingBatches.length > 0
        ? String.fromCharCode(
            Math.max(...batchCheck.existingBatches.map(b => (b.batchLabel ?? "A").charCodeAt(0))) + 1,
          )
        : "B";

    return (
      <div className="space-y-5 pt-2">
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-300">
              "{pendingValues.name}" already exists in a different batch.
            </p>
            <p className="text-amber-700 dark:text-amber-400 mt-1">
              The new price or expiry date differs from existing batches. Choose how to proceed:
            </p>
          </div>
        </div>

        {/* Existing batches summary */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Existing Batches
          </p>
          {batchCheck.existingBatches.map(b => (
            <div
              key={b.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm"
            >
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs px-2">
                  Batch {b.batchLabel ?? "—"}
                </Badge>
                <span className="text-muted-foreground">{b.expiryDate?.toString()}</span>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="font-mono font-medium">₦{Number(b.price).toFixed(2)}</span>
                <span className="text-muted-foreground text-xs">{b.quantity} units</span>
              </div>
            </div>
          ))}
        </div>

        {/* New values summary */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-sm">
          <div className="flex items-center gap-2">
            <Badge className="font-mono text-xs px-2">New — Batch {nextLabel}</Badge>
            <span className="text-muted-foreground">{pendingValues.expiryDate}</span>
          </div>
          <div className="flex items-center gap-3 text-right">
            <span className="font-mono font-medium">₦{Number(pendingValues.price).toFixed(2)}</span>
            <span className="text-muted-foreground text-xs">{pendingValues.quantity} units</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3.5 px-4"
            onClick={() => setStep("SELECT_BATCH")}
          >
            <RefreshCw className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-sm">Update an existing batch</p>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Replace price, expiry, and quantity on a chosen batch.
              </p>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start gap-3 h-auto py-3.5 px-4"
            disabled={isPending}
            onClick={() => doCreate(pendingValues, "NEW_BATCH")}
          >
            <GitBranch className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-sm">Create Batch {nextLabel} (new batch)</p>
              <p className="text-xs text-muted-foreground font-normal mt-0.5">
                Keep all existing batches unchanged and add a new one.
              </p>
            </div>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setStep("FORM")} className="mt-1">
            ← Back to form
          </Button>
        </div>
      </div>
    );
  };

  // ── STEP: Select which existing batch to update ───────────────────────────

  const SelectBatchStep = () => {
    if (!batchCheck || !pendingValues) return null;

    return (
      <div className="space-y-5 pt-2">
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Select a batch to update:
          </p>
          <p className="text-xs text-muted-foreground">
            The selected batch will have its price, expiry date, and quantity replaced with
            the new values you entered.
          </p>
        </div>

        <div className="space-y-2">
          {batchCheck.existingBatches.map(b => {
            const isSelected = selectedBatchId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBatchId(b.id)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm",
                  "transition-all duration-150 text-left",
                  isSelected
                    ? "border-primary bg-primary/8 ring-2 ring-primary/20"
                    : "border-border bg-muted/20 hover:bg-muted/40",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
                    isSelected ? "border-primary bg-primary" : "border-muted-foreground",
                  )} />
                  <Badge variant="outline" className="font-mono text-xs">
                    Batch {b.batchLabel ?? "—"}
                  </Badge>
                  <span className="text-muted-foreground">{b.expiryDate?.toString()}</span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <span className="font-mono font-medium">₦{Number(b.price).toFixed(2)}</span>
                  <span className="text-muted-foreground text-xs">{b.quantity} units</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Preview of what will change */}
        {selectedBatchId && (
          <div className="rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
              What will change on the selected batch:
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New price</span>
              <span className="font-mono font-medium">₦{Number(pendingValues.price).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New expiry</span>
              <span>{pendingValues.expiryDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New quantity</span>
              <span className="font-mono font-medium">{pendingValues.quantity} units</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => setStep("BATCH_CONFLICT")}>Back</Button>
          <Button
            disabled={!selectedBatchId || isPending}
            onClick={() => {
              if (selectedBatchId && pendingValues) {
                doCreate(pendingValues, "UPDATE_BATCH", selectedBatchId);
              }
            }}
          >
            {isPending ? "Saving…" : "Confirm Update"}
          </Button>
        </div>
      </div>
    );
  };

  // ── Dialog title per step ─────────────────────────────────────────────────

  const STEP_TITLES: Record<Step, string> = {
    FORM:           medicine ? "Edit Medicine" : "Add New Medicine",
    EXACT_MATCH:    "Confirm Quantity Update",
    BATCH_CONFLICT: "Duplicate Drug Detected",
    SELECT_BATCH:   "Choose Batch to Update",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button data-testid="button-add-medicine">
            <Plus className="mr-2 h-4 w-4" /> Add Medicine
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step !== "FORM" && <Layers className="h-4 w-4 text-primary" />}
            {STEP_TITLES[step]}
          </DialogTitle>
        </DialogHeader>

        {step === "FORM"           && <FormStep />}
        {step === "EXACT_MATCH"    && <ExactMatchStep />}
        {step === "BATCH_CONFLICT" && <BatchConflictStep />}
        {step === "SELECT_BATCH"   && <SelectBatchStep />}
      </DialogContent>
    </Dialog>
  );
}