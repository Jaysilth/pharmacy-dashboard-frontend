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
import { Plus, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { Medicine } from "@/types/api";

const medicineSchema = z.object({
  name: z.string().min(1, "Name is required"),
  quantity: z.coerce.number().min(0, "Must be 0 or more"),
  price: z.coerce.number().min(0, "Must be 0 or more"),
  expiryDate: z.string().min(1, "Expiry date is required"),
  lowStockThreshold: z.coerce.number().min(0).optional(),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
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

  // Pull existing medicines for duplicate check — only runs when modal is open
  const { data: existingMedicines } = useGetMedicines(
    undefined,
    { enabled: open && !medicine }
  );

  const form = useForm<MedicineForm>({
    resolver: zodResolver(medicineSchema) as Resolver<MedicineForm>,
    defaultValues: medicine
      ? {
          name: medicine.name,
          quantity: medicine.quantity,
          price: medicine.price,
          expiryDate: medicine.expiryDate.split("T")[0],
          lowStockThreshold: medicine.lowStockThreshold,
          description: medicine.description ?? "",
          manufacturer: medicine.manufacturer ?? "",
        }
      : {
          name: "",
          quantity: 0,
          price: 0,
          expiryDate: format(new Date(), "yyyy-MM-dd"),
          lowStockThreshold: 10,
          description: "",
          manufacturer: "",
        },
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setDuplicateMatch(null);
    setConfirmedDuplicate(false);
    if (next) {
      form.reset(
        medicine
          ? {
              name: medicine.name,
              quantity: medicine.quantity,
              price: medicine.price,
              expiryDate: medicine.expiryDate.split("T")[0],
              lowStockThreshold: medicine.lowStockThreshold,
              description: medicine.description ?? "",
              manufacturer: medicine.manufacturer ?? "",
            }
          : {
              name: "",
              quantity: 0,
              price: 0,
              expiryDate: format(new Date(), "yyyy-MM-dd"),
              lowStockThreshold: 10,
              description: "",
              manufacturer: "",
            },
      );
    }
  };

  const onSubmit = (values: MedicineForm) => {
    if (medicine) {
      // Edit mode — no duplicate check needed
      updateMedicine.mutate(
        { id: medicine.id, data: values },
        {
          onSuccess: () => { toast({ title: "Medicine updated." }); setOpen(false); },
          onError: (err) => toast({ title: "Update failed", description: String(err), variant: "destructive" }),
        },
      );
      return;
    }

    // Add mode — check for duplicate name before submitting
    if (!confirmedDuplicate && existingMedicines) {
      const match = existingMedicines.find(
        (m) => m.name.trim().toLowerCase() === values.name.trim().toLowerCase()
      );
      if (match) {
        setDuplicateMatch(match);
        return; // Stop here — show the warning instead
      }
    }

    createMedicine.mutate(values, {
      onSuccess: () => {
        toast({ title: "Medicine added." });
        form.reset();
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

        {/* ── Duplicate warning banner ── */}
        {duplicateMatch && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">
                  "{duplicateMatch.name}" already exists in inventory.
                </p>
                <p className="text-amber-700 mt-1">
                  Current stock: <span className="font-mono font-medium">{duplicateMatch.quantity} units</span> at <span className="font-mono font-medium">₦{Number(duplicateMatch.price).toFixed(2)}</span> each.
                </p>
                <p className="text-amber-700 mt-1">
                  If this is a new batch with a different price or expiry date, you can create a separate record. Otherwise, use the <strong>Edit</strong> button on the existing entry to update its stock.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => { setDuplicateMatch(null); setOpen(false); }}
              >
                Cancel — I'll edit the existing one
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  setConfirmedDuplicate(true);
                  setDuplicateMatch(null);
                  // Re-trigger submit with confirmed flag
                  form.handleSubmit(onSubmit)();
                }}
              >
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
                  <Input
                    {...field}
                    data-testid="input-medicine-name"
                    onChange={(e) => {
                      field.onChange(e);
                      // Reset duplicate state when name changes
                      if (duplicateMatch) setDuplicateMatch(null);
                      if (confirmedDuplicate) setConfirmedDuplicate(false);
                    }}
                  />
                </FormControl>
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
                   <Button
                        type="submit"
                           disabled={isPending || (!medicine && !existingMedicines)}
                           data-testid="button-submit-medicine"
                   >
                     {!medicine && !existingMedicines
                       ? "Loading..."
                       : medicine
                       ? "Save Changes"
                       : "Add Medicine"}
                         </Button>
                            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}