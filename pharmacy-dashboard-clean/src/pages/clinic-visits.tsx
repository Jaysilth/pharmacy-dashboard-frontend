import { useState } from "react";
import { useClinical, type ClinicalItem } from "@/context/ClinicalContext";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2 } from "lucide-react";

const VISIT_CATEGORIES = [
  { value: "NEW",       label: "New Patient",   color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "FOLLOW_UP", label: "Follow-Up",     color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "OTHERS",    label: "Others",        color: "bg-gray-50 text-gray-600 border-gray-200" },
];

const schema = z.object({
  name:           z.string().min(1, "Name is required"),
  category:       z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  price:          z.coerce.number().min(0, "Price must be 0 or more"),
  description:    z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function VisitModal({ item, onClose }: { item?: ClinicalItem; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const { addItem, updateItem } = useClinical();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: item
      ? { name: item.name, category: item.category, customCategory: item.customCategory ?? "", price: item.price, description: item.description ?? "" }
      : { name: "", category: "", customCategory: "", price: 0, description: "" },
  });

  const watchCategory = form.watch("category");

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && item) form.reset({ name: item.name, category: item.category, customCategory: item.customCategory ?? "", price: item.price, description: item.description ?? "" });
    if (!v) { form.reset(); onClose?.(); }
  };

  const onSubmit = (values: FormData) => {
    const payload = { ...values, price: Number(values.price) };
    if (item) { updateItem("visits", item.id, payload); toast({ title: "Visit updated." }); }
    else { addItem("visits", payload); toast({ title: "Visit added." }); form.reset(); }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {item
          ? <Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-muted-foreground" /></Button>
          : <Button><Plus className="mr-2 h-4 w-4" />Add Visit Type</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{item ? "Edit Visit Type" : "Add Clinic Visit Type"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                  <SelectContent>{VISIT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            {watchCategory === "OTHERS" && (
              <FormField control={form.control} name="customCategory" render={({ field }) => (
                <FormItem><FormLabel>Custom Category Name</FormLabel><FormControl><Input placeholder="Describe the visit type…" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            )}
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem><FormLabel>Fee (₦)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Textarea className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{item ? "Save Changes" : "Add Visit"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ClinicVisitsPage() {
  const { clinicVisits, removeItem } = useClinical();
  const { toast } = useToast();

  const catInfo = (cat: string) => VISIT_CATEGORIES.find(c => c.value === cat) ?? { label: cat, color: "bg-gray-50 text-gray-600 border-gray-200" };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Clinic Visits</h1>
          <p className="text-muted-foreground mt-1">Manage consultation types and fees. Stored locally — works offline.</p>
        </div>
        <VisitModal />
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clinicVisits.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No visit types yet.</TableCell></TableRow>
              ) : clinicVisits.map(v => (
                <TableRow key={v.id} className="hover:bg-muted/10">
                  <TableCell className="pl-6 font-medium">{v.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={catInfo(v.category).color}>
                      {v.category === "OTHERS" && v.customCategory ? v.customCategory : catInfo(v.category).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{v.description || "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">₦{v.price.toLocaleString()}.00</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <VisitModal item={v} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {v.name}?</AlertDialogTitle>
                            <AlertDialogDescription>This removes it from the visit type list. Historical sales are unaffected.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { removeItem("visits", v.id); toast({ title: `${v.name} removed.` }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}