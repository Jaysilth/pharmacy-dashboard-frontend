import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { useGetIols, useGetSurgeries, useRecordIolUsage } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { IolUsageInput } from "@/types/api";
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
import { Syringe } from "lucide-react";

const schema = z.object({
  iolId:        z.coerce.number().min(1, "Select an IOL"),
  quantityUsed: z.coerce.number().min(1, "Must use at least 1"),
  surgeryId:    z.coerce.number().min(1, "Select a surgery"),
  usedBy:       z.string().optional(),
  notes:        z.string().optional(),
});
type UsageForm = z.infer<typeof schema>;

export function IolUsageModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: iols } = useGetIols(undefined, { enabled: open });
  const { data: surgeries } = useGetSurgeries(undefined, { enabled: open });
  const recordUsage = useRecordIolUsage();

  const form = useForm<UsageForm>({
    resolver: zodResolver(schema) as Resolver<UsageForm>,
    defaultValues: { iolId: undefined, quantityUsed: 1, surgeryId: undefined, usedBy: "", notes: "" },
  });

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) form.reset({ iolId: undefined, quantityUsed: 1, surgeryId: undefined, usedBy: "", notes: "" });
  };

  const onSubmit = (values: UsageForm) => {
    const payload: IolUsageInput = {
      iolId:        Number(values.iolId),
      quantityUsed: Number(values.quantityUsed),
      surgeryId:    Number(values.surgeryId),
      usedBy:       values.usedBy || undefined,
      notes:        values.notes || undefined,
    };
    recordUsage.mutate(payload, {
      onSuccess: () => { toast({ title: "IOL usage recorded." }); setOpen(false); },
      onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Syringe className="mr-2 h-4 w-4" /> Record Usage
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Record IOL Usage</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="iolId" render={({ field }) => (
              <FormItem>
                <FormLabel>IOL</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select IOL" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {iols?.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>
                        {i.name} — {i.type === "RIGID" ? "Rigid" : "Foldable"} {i.power}D ({i.quantityInStock} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="surgeryId" render={({ field }) => (
              <FormItem>
                <FormLabel>Surgery</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select surgery" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {surgeries?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="quantityUsed" render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity Used</FormLabel>
                <FormControl><Input type="number" min={1} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="usedBy" render={({ field }) => (
              <FormItem>
                <FormLabel>Used By (optional)</FormLabel>
                <FormControl><Input placeholder="Surgeon / staff name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea className="resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={recordUsage.isPending}>Record Usage</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
