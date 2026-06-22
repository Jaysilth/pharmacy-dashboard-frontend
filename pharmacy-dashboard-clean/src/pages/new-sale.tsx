import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useGetMedicines, useCreateSale } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart } from "lucide-react";

const saleSchema = z.object({
  medicineId: z.coerce.number().min(1, "Please select a medicine"),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
});

export default function NewSale() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: medicines } = useGetMedicines();
  const createSale = useCreateSale();

  const form = useForm<z.infer<typeof saleSchema>>({
    resolver: zodResolver(saleSchema) as Resolver<z.infer<typeof saleSchema>>,
    defaultValues: { medicineId: 0, quantity: 1 },
  });

  const selectedMedId = form.watch("medicineId");
  const quantity = form.watch("quantity");
  const selectedMed = medicines?.find((m) => m.id === selectedMedId);
  const totalPrice = selectedMed ? selectedMed.price * (quantity || 0) : 0;

  function onSubmit(values: z.infer<typeof saleSchema>) {
    if (!selectedMed) return;
    if (values.quantity > selectedMed.quantity) {
      toast({
        title: "Insufficient stock",
        description: `Only ${selectedMed.quantity} units available.`,
        variant: "destructive",
      });
      return;
    }
    createSale.mutate(values, {
      onSuccess: () => {
        toast({ title: "Sale recorded." });
        setLocation("/sales");
      },
      onError: (err) => toast({ title: "Failed to record sale", description: String(err), variant: "destructive" }),
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Record New Sale</h1>
        <p className="text-muted-foreground mt-1">Dispense medicine and update inventory.</p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/20 border-b border-border">
          <CardTitle className="flex items-center gap-2 text-primary">
            <ShoppingCart className="h-5 w-5" />
            Transaction Details
          </CardTitle>
          <CardDescription>Select medicine and quantity to dispense.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="medicineId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value ? field.value.toString() : ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a medicine" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {medicines?.map((med) => (
                          <SelectItem key={med.id} value={med.id.toString()} disabled={med.quantity === 0}>
                            {med.name} {med.quantity === 0 ? "(Out of stock)" : `(${med.quantity} in stock) — ₦${med.price.toFixed(2)}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity to Dispense</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-muted/30 p-4 rounded-lg border border-border flex flex-col justify-center items-end">
                  <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-foreground font-mono">₦{totalPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setLocation("/sales")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSale.isPending || !selectedMedId}>
                  {createSale.isPending ? "Processing…" : "Confirm Dispense"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}