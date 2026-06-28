import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetDashboardSummary,
  useGetSalesByDay,
  useGetLowStockMedicines,
  useGetExpiringSoonMedicines,
  useGetRecentSales,
} from "@/lib/queries";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Pill, TrendingUp, AlertTriangle, Clock, Receipt } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  alert,
  testid,
}: {
  title: string;
  value?: string | number;
  icon: React.ElementType;
  loading: boolean;
  alert?: boolean;
  testid: string;
}) {
  return (
    <Card
      className={cn(
        "shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
        alert && "border-destructive/30 dark:border-destructive/20",
      )}
      data-testid={testid}
    >
      <CardContent className="p-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate mb-1">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <p
              className={cn(
                "text-2xl font-bold leading-none",
                alert ? "text-destructive" : "text-foreground",
              )}
              data-testid={`${testid}-value`}
            >
              {value}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex-shrink-0 p-3 rounded-2xl",
            alert
              ? "bg-destructive/10 text-destructive"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Custom Recharts tooltip ───────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-primary font-mono font-bold">
        ₦{Number(payload[0].value).toLocaleString()}.00
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: summary,     isLoading: loadingSummary }     = useGetDashboardSummary();
  const { data: salesByDay,  isLoading: loadingSales }        = useGetSalesByDay();
  const { data: lowStock,    isLoading: loadingLowStock }     = useGetLowStockMedicines();
  const { data: expiring,    isLoading: loadingExpiring }     = useGetExpiringSoonMedicines();
  const { data: recentSales, isLoading: loadingRecentSales }  = useGetRecentSales();

  const alertCount =
    (summary?.lowStockCount ?? 0) + (summary?.expiringSoonCount ?? 0);

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
          data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of pharmacy operations and inventory.
        </p>
      </div>

      {/* ── Stat cards — 2 cols on mobile, 4 on lg ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Medicines"
          value={summary?.totalMedicines}
          icon={Pill}
          loading={loadingSummary}
          testid="stat-medicines"
        />
        <StatCard
          title="Sales Today"
          value={summary?.totalSalesToday}
          icon={TrendingUp}
          loading={loadingSummary}
          testid="stat-sales"
        />
        <StatCard
          title="Revenue Today"
          value={summary ? `₦${Number(summary.totalRevenueToday).toLocaleString()}` : undefined}
          icon={TrendingUp}
          loading={loadingSummary}
          testid="stat-revenue"
        />
        <StatCard
          title="Alerts"
          value={alertCount}
          icon={AlertTriangle}
          loading={loadingSummary}
          alert={alertCount > 0}
          testid="stat-alerts"
        />
      </div>

      {/* ── Revenue chart + alert panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

        {/* Revenue chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSales ? (
              <Skeleton className="h-[240px] sm:h-[280px] w-full" />
            ) : salesByDay && salesByDay.length > 0 ? (
              /*
               * ResponsiveContainer height must be a fixed px value (not "100%")
               * to avoid the "-1 height" Recharts bug when inside a flex parent.
               */
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={salesByDay}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                No sales data yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert panels */}
        <div className="flex flex-col gap-4">

          {/* Low stock */}
          <Card className="shadow-sm flex-1">
            <CardHeader className="py-3 px-5">
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Low Stock
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 max-h-[140px] overflow-auto space-y-2.5">
              {loadingLowStock ? (
                <Skeleton className="h-10 w-full" />
              ) : lowStock && lowStock.length > 0 ? (
                lowStock.map((med) => (
                  <div
                    key={med.id}
                    className="flex justify-between items-center"
                    data-testid={`alert-lowstock-${med.id}`}
                  >
                    <p className="text-sm font-medium truncate pr-2">{med.name}</p>
                    <Badge variant="destructive" className="font-mono text-[10px] flex-shrink-0">
                      {med.quantity}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No low stock alerts.</p>
              )}
            </CardContent>
          </Card>

          {/* Expiring soon */}
          <Card className="shadow-sm flex-1">
            <CardHeader className="py-3 px-5">
              <CardTitle className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Clock className="h-4 w-4" />
                Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 max-h-[140px] overflow-auto space-y-2.5">
              {loadingExpiring ? (
                <Skeleton className="h-10 w-full" />
              ) : expiring && expiring.length > 0 ? (
                expiring.map((med) => (
                  <div
                    key={med.id}
                    className="flex flex-col gap-0.5"
                    data-testid={`alert-expiring-${med.id}`}
                  >
                    <p className="text-sm font-medium">{med.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(med.expiryDate), "MMM d, yyyy")}
                      <span className="ml-2 font-mono text-amber-600 dark:text-amber-400">
                        {med.quantity} left
                      </span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No medicines expiring soon.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Recent sales ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" />
            Recent Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRecentSales ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentSales && recentSales.length > 0 ? (
            <div className="divide-y divide-border -mx-2">
              {recentSales.map((sale) => {
                const total = sale.grandTotal ?? sale.totalPrice ?? 0;
                const name =
                  sale.items?.[0]?.itemName ??
                  sale.medicine?.name ??
                  "Unknown";
                const count = sale.items?.length ?? 1;

                return (
                  <div
                    key={sale.id}
                    className="flex justify-between items-center px-2 py-3 rounded-xl
                      hover:bg-muted/40 transition-colors duration-150"
                    data-testid={`recent-sale-${sale.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {format(new Date(sale.createdAt), "MMM d · h:mm a")}
                        {count > 1 && (
                          <span className="ml-1.5 text-primary">+{count - 1} more</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-bold font-mono text-foreground">
                        ₦{Number(total).toLocaleString()}
                      </p>
                      {sale.paymentMethod && (
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {sale.paymentMethod}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No recent sales.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}