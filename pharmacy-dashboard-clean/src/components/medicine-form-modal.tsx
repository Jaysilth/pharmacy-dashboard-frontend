import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useCreateMedicine, useUpdateMedicine } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
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
  const { toast } = useToast();
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();

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

  // Reset form defaults when medicine prop changes (edit mode)
  const onOpenChange = (next: boolean) => {
    setOpen(next);
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
      updateMedicine.mutate(
        { id: medicine.id, data: values },
        {
          onSuccess: () => { toast({ title: "Medicine updated." }); setOpen(false); },
          onError: (err) => toast({ title: "Update failed", description: String(err), variant: "destructive" }),
        },
      );
    } else {
      createMedicine.mutate(values, {
        onSuccess: () => { toast({ title: "Medicine added." }); form.reset(); setOpen(false); },
        onError: (err) => toast({ title: "Add failed", description: String(err), variant: "destructive" }),
      });
    }
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Medicine Name</FormLabel>
                <FormControl><Input {...field} data-testid="input-medicine-name" /></FormControl>
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
              <Button type="submit" disabled={isPending} data-testid="button-submit-medicine">
                {medicine ? "Save Changes" : "Add Medicine"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}