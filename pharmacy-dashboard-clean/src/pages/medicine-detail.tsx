import { useRoute } from "wouter";
import { useGetMedicine, useGetSales } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Box, Calendar, DollarSign, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default function MedicineDetail() {
  const [, params] = useRoute("/medicines/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: medicine, isLoading } = useGetMedicine(id);
  const { data: sales, isLoading: loadingSales } = useGetSales({ medicineId: id, limit: 10 }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!medicine) {
    return <div className="p-8 text-center text-muted-foreground">Medicine not found.</div>;
  }

  const isLowStock = medicine.quantity <= medicine.lowStockThreshold;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {medicine.name}
            {isLowStock && <Badge variant="destructive">Low Stock</Badge>}
          </h1>
          <p className="text-muted-foreground mt-1">Manufacturer: {medicine.manufacturer ?? "N/A"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <InfoCard icon={Box} label="Stock Quantity" value={medicine.quantity} />
        <InfoCard icon={DollarSign} label="Unit Price" value={`₦${medicine.price.toFixed(2)}`} />
        <InfoCard icon={Calendar} label="Expiry Date" value={format(new Date(medicine.expiryDate), "MMM d, yyyy")} />
        <InfoCard icon={Activity} label="Low Stock Alert At" value={medicine.lowStockThreshold} />
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead className="text-right">Quantity Sold</TableHead>
                <TableHead className="text-right pr-6">Total Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingSales ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sales && sales.length > 0 ? (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="pl-6">{format(new Date(sale.createdAt), "MMM d, yyyy h:mm a")}</TableCell>
                    <TableCell className="text-right font-mono">{sale.quantity}</TableCell>
                    <TableCell className="text-right pr-6 font-mono text-primary font-medium">₦{sale.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    No sales recorded for this medicine yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}