import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useCreateIol, useUpdateIol } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { Iol, IolInput } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const schema = z.object({
  name:            z.string().min(1, "Name is required"),
  type:            z.enum(["RIGID", "FOLDABLE"], { error: "Type is required" }),
  power:           z.coerce.number().positive("Power must be positive"),
  manufacturer:    z.string().optional(),
  description:     z.string().optional(),
  quantityInStock: z.coerce.number().min(0),
  reorderLevel:    z.coerce.number().min(0).optional(),
});
type IolForm = z.infer<typeof schema>;

export function IolModal({
  item,
  trigger,
}: {
  item?: Iol;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useCreateIol();
  const update = useUpdateIol();

  const def = (i?: Iol): IolForm => i
    ? {
        name:            i.name,
        type:            i.type,
        power:           i.power,
        manufacturer:    i.manufacturer ?? "",
        description:     i.description ?? "",
        quantityInStock: i.quantityInStock,
        reorderLevel:    i.reorderLevel,
      }
    : {
        name: "", type: "FOLDABLE", power: 21, manufacturer: "",
        description: "", quantityInStock: 0, reorderLevel: 3,
      };

  const form = useForm<IolForm>({
    resolver: zodResolver(schema) as Resolver<IolForm>,
    defaultValues: def(item),
  });

  const onOpenChange = (v: boolean) => { setOpen(v); if (v) form.reset(def(item)); };

  const onSubmit = (values: IolForm) => {
    const payload: IolInput = {
      ...values,
      power:           Number(values.power),
      quantityInStock: Number(values.quantityInStock),
      reorderLevel:    Number(values.reorderLevel ?? 3),
    };
    if (item) {
      update.mutate({ id: item.id, data: payload }, {
        onSuccess: () => { toast({ title: "IOL updated." }); setOpen(false); },
        onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          toast({ title: "IOL stock saved." });
          form.reset(def());
          setOpen(false);
        },
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
            <Plus className="mr-2 h-4 w-4" /> Add IOL
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit IOL" : "Add IOL"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="e.g. AcrySof, SN60WF…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="RIGID">Rigid</SelectItem>
                      <SelectItem value="FOLDABLE">Foldable</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="power" render={({ field }) => (
                <FormItem>
                  <FormLabel>Power (D)</FormLabel>
                  <FormControl><Input type="number" step="0.25" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="manufacturer" render={({ field }) => (
              <FormItem>
                <FormLabel>Manufacturer (optional)</FormLabel>
                <FormControl><Input placeholder="e.g. Alcon, J&J…" {...field} /></FormControl>
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

            {!item && (
              <p className="text-xs text-muted-foreground -mt-2">
                If an IOL with this exact name, type, and power already exists, the quantity will be added to that row instead of creating a duplicate.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {item ? "Save Changes" : "Add IOL"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
