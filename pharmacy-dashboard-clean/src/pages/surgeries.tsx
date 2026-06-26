import { useState } from "react";
import { useGetSurgeries, useCreateSurgery, useUpdateSurgery, useDeleteSurgery } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { Surgery, SurgeryInput } from "@/types/api";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Search, Clock } from "lucide-react";

const schema = z.object({
  name:            z.string().min(1, "Name is required"),
  category:        z.string().optional(),
  description:     z.string().optional(),
  price:           z.coerce.number().min(0.01, "Price must be greater than 0"),
  durationMinutes: z.coerce.number().min(0).optional(),
  active:          z.boolean().optional(),
});
type SurgeryForm = z.infer<typeof schema>;

const defaultValues: SurgeryForm = { name: "", category: "", description: "", price: 0, durationMinutes: undefined, active: true };

function SurgeryFormModal({ surgery, trigger }: { surgery?: Surgery; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const create = useCreateSurgery();
  const update = useUpdateSurgery();

  const form = useForm<SurgeryForm>({
    resolver: zodResolver(schema) as Resolver<SurgeryForm>,
    defaultValues: surgery ? {
      name: surgery.name, category: surgery.category ?? "", description: surgery.description ?? "",
      price: surgery.price, durationMinutes: surgery.durationMinutes ?? undefined, active: surgery.active,
    } : defaultValues,
  });

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) form.reset(surgery ? {
      name: surgery.name, category: surgery.category ?? "", description: surgery.description ?? "",
      price: surgery.price, durationMinutes: surgery.durationMinutes ?? undefined, active: surgery.active,
    } : defaultValues);
  };

  const onSubmit = (values: SurgeryForm) => {
    const payload: SurgeryInput = { ...values, price: Number(values.price), active: values.active ?? true };
    const action = surgery
      ? update.mutate({ id: surgery.id, data: payload }, { onSuccess: () => { toast({ title: "Surgery updated." }); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : "Update failed.", variant: "destructive" }) })
      : create.mutate(payload, { onSuccess: () => { toast({ title: "Surgery added." }); form.reset(defaultValues); setOpen(false); }, onError: e => toast({ title: "Error", description: e instanceof ApiError ? e.message : "Add failed.", variant: "destructive" }) });
    void action;
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button><Plus className="mr-2 h-4 w-4" />Add Surgery</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>{surgery ? "Edit Surgery" : "Add New Surgery"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Surgery Name</FormLabel><FormControl><Input placeholder="e.g. LASIK, Cataract Removal…" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="Refractive, Cataract…" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="durationMinutes" render={({ field }) => (<FormItem><FormLabel>Duration (mins)</FormLabel><FormControl><Input type="number" placeholder="60" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="price" render={({ field }) => (<FormItem><FormLabel>Price (₦)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{surgery ? "Save Changes" : "Add Surgery"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SurgeriesPage() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const { data: surgeries, isLoading } = useGetSurgeries({ search: search || undefined });
  const deleteSurgery = useDeleteSurgery();

  const handleDelete = (s: Surgery) => {
    deleteSurgery.mutate(s.id, {
      onSuccess: () => toast({ title: `${s.name} deactivated.` }),
      onError: e => toast({ title: "Failed.", description: e instanceof ApiError ? e.message : String(e), variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Surgery Services</h1>
          <p className="text-muted-foreground mt-1">Manage surgical procedures and pricing.</p>
        </div>
        <SurgeryFormModal />
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="py-3 px-4 border-b border-border bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 bg-background" placeholder="Search by name or category…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (<TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>))}
                </TableRow>
              )) : surgeries && surgeries.length > 0 ? surgeries.map(s => (
                <TableRow key={s.id} className="hover:bg-muted/10">
                  <TableCell className="pl-6">
                    <p className="font-medium">{s.name}</p>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.category ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono font-medium">₦{Number(s.price).toFixed(2)}</TableCell>
                  <TableCell>
                    {s.durationMinutes
                      ? <span className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" />{s.durationMinutes} min</span>
                      : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    {s.active
                      ? <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Active</Badge>
                      : <Badge variant="outline" className="bg-muted text-muted-foreground">Inactive</Badge>}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <SurgeryFormModal surgery={s} trigger={<Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-muted-foreground" /></Button>} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deactivate {s.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This hides the surgery from new sales but preserves its sales history.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Deactivate</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{search ? `No surgeries matching "${search}".` : "No surgery services yet."}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
