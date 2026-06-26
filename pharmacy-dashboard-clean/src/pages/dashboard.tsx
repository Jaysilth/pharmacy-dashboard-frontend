import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetDashboardSummary,
  useGetLowStockMedicines,
  useGetExpiringSoonMedicines,
  useGetRecentSales,
  useGetSales,
} from "@/lib/queries";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Pill, TrendingUp, AlertTriangle, Clock, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  format, 
  startOfToday, 
  endOfToday, 
  eachHourOfInterval, 
  isSameHour,
  subDays,
  eachDayOfInterval,
  isSameDay,
  eachWeekOfInterval,
  subMonths,
  eachMonthOfInterval,
  isSameMonth
} from "date-fns";

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState<"today" | "7days" | "1month" | "1year">("7days");

  const {
    data: summary,
    isLoading: loadingSummary,
    isError: summaryHasError,
    error: summaryError,
  } = useGetDashboardSummary();
  
  const {
    data: lowStock,
    isLoading: loadingLowStock,
    isError: lowStockHasError,
    error: lowStockError,
  } = useGetLowStockMedicines();
  
  const {
    data: expiringSoon,
    isLoading: loadingExpiring,
    isError: expiringSoonHasError,
    error: expiringSoonError,
  } = useGetExpiringSoonMedicines();
  
  const {
    data: recentSales,
    isLoading: loadingRecentSales,
    isError: recentSalesHasError,
    error: recentSalesError,
  } = useGetRecentSales();

  // Fetch all sales for local aggregation
  const {
    data: allSales,
    isLoading: loadingAllSales,
    isError: allSalesHasError,
    error: allSalesError,
  } = useGetSales();

  const chartData = useMemo(() => {
    if (!allSales) return [];
    const now = new Date();
    
    if (timeRange === "today") {
      const start = startOfToday();
      const end = endOfToday();
      const hours = eachHourOfInterval({ start, end });
      return hours.map(hour => {
        const salesInHour = allSales.filter(sale => isSameHour(new Date(sale.createdAt), hour));
        const totalRevenue = salesInHour.reduce((sum, sale) => sum + (sale.grandTotal ?? sale.totalPrice ?? 0), 0);
        return {
          date: format(hour, "ha"),
          totalRevenue
        };
      });
    }
    
    if (timeRange === "7days") {
      const start = subDays(now, 6);
      const days = eachDayOfInterval({ start, end: now });
      return days.map(day => {
        const salesInDay = allSales.filter(sale => isSameDay(new Date(sale.createdAt), day));
        const totalRevenue = salesInDay.reduce((sum, sale) => sum + (sale.grandTotal ?? sale.totalPrice ?? 0), 0);
        return {
          date: format(day, "MMM d"),
          totalRevenue
        };
      });
    }
    
    if (timeRange === "1month") {
      const start = subDays(now, 29);
      const weeks = eachWeekOfInterval({ start, end: now });
      return weeks.map(week => {
        const weekEnd = new Date(week.getTime() + 7 * 24 * 60 * 60 * 1000);
        const salesInWeek = allSales.filter(sale => {
          const d = new Date(sale.createdAt);
          return d >= week && d < weekEnd;
        });
        const totalRevenue = salesInWeek.reduce((sum, sale) => sum + (sale.grandTotal ?? sale.totalPrice ?? 0), 0);
        return {
          date: `Wk of ${format(week, "MMM d")}`,
          totalRevenue
        };
      });
    }
    
    if (timeRange === "1year") {
      const start = subMonths(now, 11);
      const months = eachMonthOfInterval({ start, end: now });
      return months.map(month => {
        const salesInMonth = allSales.filter(sale => isSameMonth(new Date(sale.createdAt), month));
        const totalRevenue = salesInMonth.reduce((sum, sale) => sum + (sale.grandTotal ?? sale.totalPrice ?? 0), 0);
        return {
          date: format(month, "MMM yyyy"),
          totalRevenue
        };
      });
    }
    
    return [];
  }, [allSales, timeRange]);

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "An unexpected error occurred.";
  };

  const formatSummaryValue = (value: number | undefined) =>
    typeof value === "number" ? value : "—";

  const formatCurrency = (value: number | undefined) =>
    typeof value === "number" ? `₦${value.toFixed(2)}` : "—";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of pharmacy operations and inventory.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Total Medicines"
          value={formatSummaryValue(summary?.totalMedicines)}
          icon={Pill}
          loading={loadingSummary}
          error={summaryHasError}
          testid="stat-medicines"
        />
        <StatCard
          title="Sales Today"
          value={formatSummaryValue(summary?.totalSalesToday)}
          icon={TrendingUp}
          loading={loadingSummary}
          error={summaryHasError}
          testid="stat-sales"
        />
        <StatCard
          title="Revenue Today"
          value={formatCurrency(summary?.totalRevenueToday)}
          icon={TrendingUp}
          loading={loadingSummary}
          error={summaryHasError}
          testid="stat-revenue"
        />
        <StatCard
          title="Alerts"
          value={formatSummaryValue(
            (summary?.lowStockCount ?? 0) + (summary?.expiringSoonCount ?? 0),
          )}
          icon={AlertTriangle}
          loading={loadingSummary}
          alert={(summary?.lowStockCount ?? 0) > 0 || (summary?.expiringSoonCount ?? 0) > 0}
          error={summaryHasError}
          testid="stat-alerts"
        />
      </div>
      {summaryHasError ? (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Error loading summary: {getErrorMessage(summaryError)}
        </div>
      ) : null}

     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border flex flex-col min-w-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Revenue Overview</CardTitle>
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today (Per Hour)</SelectItem>
                <SelectItem value="7days">Last 7 Days (Per Day)</SelectItem>
                <SelectItem value="1month">Last 1 Month (Per Week)</SelectItem>
                <SelectItem value="1year">Last 1 Year (Per Month)</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {loadingAllSales ? (
              <Skeleton className="h-[300px] w-full" data-testid="skeleton-chart" />
            ) : allSalesHasError ? (
              <div className="h-[300px] flex items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 px-4 text-sm text-destructive">
                Failed to load sales data: {getErrorMessage(allSalesError)}
              </div>
            ) : chartData && chartData.length > 0 ? (
              <div className="h-[300px] w-full" data-testid="chart-sales">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value) => {
                        const n = typeof value === "number" ? value : 0;
                        return [`₦${n.toFixed(2)}`, "Revenue"];
                      }}
                    />
                    <Line type="monotone" dataKey="totalRevenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">No sales data available.</div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 flex flex-col">
          <Card className="shadow-sm border-border flex-1">
            <CardHeader className="py-4">
              <CardTitle className="flex items-center text-destructive text-base">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[160px] space-y-3">
              {loadingLowStock ? (
                <Skeleton className="h-10 w-full" />
              ) : lowStockHasError ? (
                <div className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  Error loading low stock alerts: {getErrorMessage(lowStockError)}
                </div>
              ) : lowStock && lowStock.length > 0 ? (
                lowStock.map((med) => (
                  <div key={med.id} className="flex justify-between items-center" data-testid={`alert-lowstock-${med.id}`}>
                    <p className="font-medium text-sm truncate pr-2">{med.name}</p>
                    <Badge variant="destructive" className="font-mono flex-shrink-0">{med.quantity} left</Badge>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No low stock alerts.</div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border flex-1">
            <CardHeader className="py-4">
              <CardTitle className="flex items-center text-amber-600 text-base">
                <Clock className="h-4 w-4 mr-2" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[160px] space-y-3">
              {loadingExpiring ? (
                <Skeleton className="h-10 w-full" />
              ) : expiringSoonHasError ? (
                <div className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                  Error loading expiring soon alerts: {getErrorMessage(expiringSoonError)}
                </div>
              ) : expiringSoon && expiringSoon.length > 0 ? (
                expiringSoon.map((med) => (
                  <div key={med.id} className="flex flex-col" data-testid={`alert-expiring-${med.id}`}>
                    <p className="font-medium text-sm truncate">{med.name}</p>
                    <p className="text-xs text-muted-foreground flex justify-between items-center mt-1">
                      <span>Expires: {format(new Date(med.expiryDate), "MMM d, yyyy")}</span>
                      <span className="font-mono font-medium text-amber-600">Stock: {med.quantity}</span>
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No medicines expiring soon.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Receipt className="h-5 w-5 mr-2" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingRecentSales ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : recentSalesHasError ? (
              <div className="text-sm text-destructive rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-center">
                Error loading recent sales: {getErrorMessage(recentSalesError)}
              </div>
            ) : recentSales && recentSales.length > 0 ? (
              recentSales.map((sale) => (
                <div key={sale.id} className="flex justify-between items-center border-b border-border pb-3 last:border-0 last:pb-0" data-testid={`recent-sale-${sale.id}`}>
                  <div>
                    <p className="font-medium text-sm">{sale.items?.[0]?.itemName ?? sale.medicine?.name ?? 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(sale.createdAt), "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-medium text-foreground">₦{(sale.grandTotal ?? sale.totalPrice ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{sale.items?.length ?? 1} item{(sale.items?.length ?? 1) !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">No recent sales.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading, alert, error, testid }: { title: string; value?: string | number; icon: React.ElementType; loading: boolean; alert?: boolean; error?: boolean; testid: string }) {
  const displayValue = error ? "Error" : value;

  return (
    <Card className={`shadow-sm border-border ${alert ? "border-destructive/50 bg-destructive/5" : ""}`} data-testid={testid}>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <h3 className={`text-2xl font-bold ${error ? "text-destructive" : alert ? "text-destructive" : "text-foreground"}`} data-testid={`${testid}-value`}>
              {displayValue}
            </h3>
          )}
        </div>
        <div className={`p-3 rounded-full ${alert || error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}