import { useState } from "react";
import { useClinical, type ClinicalItem } from "@/context/ClinicalContext";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
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

const LAB_CATEGORIES = [
  { value: "RVS",    label: "Retroviral Screening",  color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "FBS",    label: "Fasting Blood Sugar",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "OTHERS", label: "Others",                color: "bg-gray-50 text-gray-600 border-gray-200" },
];

const schema = z.object({
  name:           z.string().min(1, "Name is required"),
  category:       z.string().min(1, "Category is required"),
  customCategory: z.string().optional(),
  price:          z.coerce.number().min(0),
  description:    z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function LabModal({ item }: { item?: ClinicalItem }) {
  const [open, setOpen] = useState(false);
  const { addItem, updateItem } = useClinical();
  const { toast } = useToast();

  const defaults = (i?: ClinicalItem): FormData => i
    ? { name: i.name, category: i.category, customCategory: i.customCategory ?? "", price: i.price, description: i.description ?? "" }
    : { name: "", category: "", customCategory: "", price: 0, description: "" };

  const form = useForm<FormData>({ resolver: zodResolver(schema) as Resolver<FormData>, defaultValues: defaults(item) });
  const watchCategory = form.watch("category");
  const onOpenChange = (v: boolean) => { setOpen(v); if (v) form.reset(defaults(item)); };

  const onSubmit = (values: FormData) => {
    const payload = { ...values, price: Number(values.price) };
    if (item) { updateItem("labs", item.id, payload); toast({ title: "Lab test updated." }); }
    else { addItem("labs", payload); toast({ title: "Lab test added." }); form.reset(defaults()); }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {item
          ? <Button variant="ghost" size="icon"><Edit className="h-4 w-4 text-muted-foreground" /></Button>
          : <Button><Plus className="mr-2 h-4 w-4" />Add Lab Test</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader><DialogTitle>{item ? "Edit Lab Test" : "Add Lab Test"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                  <SelectContent>{LAB_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />
            {watchCategory === "OTHERS" && (
              <FormField control={form.control} name="customCategory" render={({ field }) => (
                <FormItem><FormLabel>Custom Category Name</FormLabel><FormControl><Input placeholder="Describe the test…" {...field} /></FormControl><FormMessage /></FormItem>
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
              <Button type="submit">{item ? "Save Changes" : "Add Lab Test"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function LabTestsPage() {
  const { labTests, removeItem } = useClinical();
  const { toast } = useToast();
  const catInfo = (cat: string) => LAB_CATEGORIES.find(c => c.value === cat) ?? { label: cat, color: "bg-gray-50 text-gray-600 border-gray-200" };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Laboratory Tests</h1>
          <p className="text-muted-foreground mt-1">Manage ocular screening tests and fees. Stored locally — works offline.</p>
        </div>
        <LabModal />
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
              {labTests.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No lab tests yet.</TableCell></TableRow>
              ) : labTests.map(l => (
                <TableRow key={l.id} className="hover:bg-muted/10">
                  <TableCell className="pl-6 font-medium">{l.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={catInfo(l.category).color}>
                      {l.category === "OTHERS" && l.customCategory ? l.customCategory : catInfo(l.category).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{l.description || "—"}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">₦{l.price.toLocaleString()}.00</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <LabModal item={l} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove {l.name}?</AlertDialogTitle>
                            <AlertDialogDescription>Removes from lab test list. Historical sales unaffected.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { removeItem("labs", l.id); toast({ title: `${l.name} removed.` }); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
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