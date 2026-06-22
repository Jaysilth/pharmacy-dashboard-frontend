import { useGetSales } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Sales() {
  const { data: sales, isLoading } = useGetSales({ limit: 50 });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Sales Log</h1>
          <p className="text-muted-foreground mt-1">Recent transactions and dispense history.</p>
        </div>
        <Button asChild>
          <Link href="/sales/new">
            <Plus className="mr-2 h-4 w-4" /> New Sale
          </Link>
        </Button>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="pl-6">Date</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right pr-6">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6"><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-8 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell className="text-right pr-6"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sales && sales.length > 0 ? (
                sales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-muted/10 transition-colors">
                    <TableCell className="pl-6 text-muted-foreground">
                      {format(new Date(sale.createdAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/medicines/${sale.medicine.id}`} className="hover:underline text-primary">
                        {sale.medicine.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono">{sale.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">₦{sale.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right pr-6 font-mono font-semibold text-foreground">₦{sale.totalPrice.toFixed(2)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No sales recorded yet.
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