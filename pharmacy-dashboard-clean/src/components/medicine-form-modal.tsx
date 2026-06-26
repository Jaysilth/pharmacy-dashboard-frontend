import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useCreateMedicine, useUpdateMedicine, useGetMedicines } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { Medicine } from "@/types/api";

const CATEGORIES = [
  { value: "EYEDROP",   label: "Eye Drop" },
  { value: "TABLET",    label: "Tablet" },
  { value: "INJECTION", label: "Injection" },
  { value: "SYRUP",     label: "Syrup" },
] as const;

const medicineSchema = z.object({
  name:              z.string().min(1, "Name is required"),
  category:          z.string().min(1, "Category is required"),
  quantity:          z.coerce.number().min(0, "Must be 0 or more"),
  price:             z.coerce.number().min(0, "Must be 0 or more"),
  expiryDate:        z.string().min(1, "Expiry date is required"),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  description:       z.string().optional(),
  manufacturer:      z.string().optional(),
});

type MedicineForm = z.infer<typeof medicineSchema>;

interface Props {
  medicine?: Medicine;
  trigger?: React.ReactNode;
}

export function MedicineFormModal({ medicine, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<Medicine | null>(null);
  const [confirmedDuplicate, setConfirmedDuplicate] = useState(false);
  const { toast } = useToast();
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();

  const { data: existingMedicines } = useGetMedicines(
    undefined,
    { enabled: open && !medicine }
  );

  const emptyDefaults: MedicineForm = {
    name: "", category: "", quantity: 0, price: 0,
    expiryDate: format(new Date(), "yyyy-MM-dd"),
    lowStockThreshold: 10, description: "", manufacturer: "",
  };

  const editDefaults = (m: Medicine): MedicineForm => ({
    name: m.name,
    category: m.category ?? "",
    quantity: m.quantity,
    price: m.price,
    expiryDate: m.expiryDate.split("T")[0],
    lowStockThreshold: m.lowStockThreshold,
    description: m.description ?? "",
    manufacturer: m.manufacturer ?? "",
  });

  const form = useForm<MedicineForm>({
    resolver: zodResolver(medicineSchema) as Resolver<MedicineForm>,
    defaultValues: medicine ? editDefaults(medicine) : emptyDefaults,
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setDuplicateMatch(null);
    setConfirmedDuplicate(false);
    if (next) form.reset(medicine ? editDefaults(medicine) : emptyDefaults);
  };

  const onSubmit = (values: MedicineForm) => {
    if (medicine) {
      updateMedicine.mutate(
        { id: medicine.id, data: values },
        {
          onSuccess: () => { toast({ title: "Medicine updated." }); setOpen(false); },
          onError: (err) => toast({ title: "Update failed", description: String(err), variant: "destructive" }),
        },
      );
      return;
    }

    if (!confirmedDuplicate && existingMedicines) {
      const match = existingMedicines.find(
        m => m.name.trim().toLowerCase() === values.name.trim().toLowerCase()
      );
      if (match) { setDuplicateMatch(match); return; }
    }

    createMedicine.mutate(values, {
      onSuccess: () => {
        toast({ title: "Medicine added." });
        form.reset(emptyDefaults);
        setOpen(false);
        setDuplicateMatch(null);
        setConfirmedDuplicate(false);
      },
      onError: (err) => toast({ title: "Add failed", description: String(err), variant: "destructive" }),
    });
  };

  const isPending = createMedicine.isPending || updateMedicine.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button data-testid="button-add-medicine">
            <Plus className="mr-2 h-4 w-4" /> Add Medicine
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{medicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
        </DialogHeader>

        {/* Duplicate warning */}
        {duplicateMatch && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">
                  "{duplicateMatch.name}" already exists in inventory.
                </p>
                <p className="text-amber-700 mt-1">
                  Current stock:{" "}
                  <span className="font-mono font-medium">{duplicateMatch.quantity} units</span>{" "}
                  at <span className="font-mono font-medium">₦{Number(duplicateMatch.price).toFixed(2)}</span>.
                </p>
                <p className="text-amber-700 mt-1">
                  Use the <strong>Edit</strong> button on the existing entry to update stock,
                  or create a separate record for a new batch.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm"
                onClick={() => { setDuplicateMatch(null); setOpen(false); }}>
                Cancel — I'll edit the existing one
              </Button>
              <Button type="button" size="sm" variant="destructive"
                onClick={() => {
                  setConfirmedDuplicate(true);
                  setDuplicateMatch(null);
                  form.handleSubmit(onSubmit)();
                }}>
                Create separate record anyway
              </Button>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Medicine Name</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-medicine-name"
                    onChange={e => {
                      field.onChange(e);
                      if (duplicateMatch) setDuplicateMatch(null);
                      if (confirmedDuplicate) setConfirmedDuplicate(false);
                    }} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Category select */}
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-medicine-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
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
                  <FormControl><Input type="number" {...field} data-testid="input-medicine-quantity" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price (₦)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} data-testid="input-medicine-price" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="expiryDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-medicine-expiry" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                <FormItem>
                  <FormLabel>Low Stock Alert At</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-medicine-threshold" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="manufacturer" render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturer (optional)</FormLabel>
                <FormControl><Input {...field} data-testid="input-medicine-manufacturer" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl><Textarea {...field} className="resize-none" data-testid="input-medicine-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit"
                disabled={isPending || (!medicine && !existingMedicines)}
                data-testid="button-submit-medicine">
                {!medicine && !existingMedicines
                  ? "Loading..."
                  : medicine ? "Save Changes" : "Add Medicine"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}