import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useGetDashboardSummary,
  useGetSalesByDay,
  useGetLowStockMedicines,
  useGetExpiringSoonMedicines,
  useGetRecentSales,
} from "@/lib/queries";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Pill, TrendingUp, AlertTriangle, Clock, Receipt, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// ── Stat card ─────────────────────────────────────────────────────────────────

const CARD_ACCENT: Record<string, string> = {
  blue:    "bg-[#2F80ED]/10 text-[#2F80ED]",
  green:   "bg-[#27AE60]/10 text-[#27AE60]",
  amber:   "bg-[#F2C94C]/15 text-amber-600",
  red:     "bg-[#EB5757]/10 text-[#EB5757]",
};

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  accent = "blue",
  trend,
  testid,
}: {
  title: string;
  value?: string | number;
  icon: React.ElementType;
  loading: boolean;
  accent?: keyof typeof CARD_ACCENT;
  trend?: string;
  testid: string;
}) {
  return (
    <div
      className="card-lift bg-card rounded-xl p-5 flex flex-col gap-4 border border-border"
      data-testid={testid}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", CARD_ACCENT[accent])}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        {trend && (
          <span className="flex items-center gap-0.5 text-xs font-semibold text-[#27AE60]">
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
            {trend}
          </span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
          {title}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <p
            className="text-2xl font-bold text-foreground leading-none"
            data-testid={`${testid}-value`}
          >
            {value ?? "—"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────

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
      <p className="text-muted-foreground mb-1 text-xs font-medium">{label}</p>
      <p className="text-foreground font-bold font-mono text-base">
        ₦{Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: summary,     isLoading: loadingSummary }    = useGetDashboardSummary();
  const { data: salesByDay,  isLoading: loadingSales }       = useGetSalesByDay();
  const { data: lowStock,    isLoading: loadingLowStock }    = useGetLowStockMedicines();
  const { data: expiring,    isLoading: loadingExpiring }    = useGetExpiringSoonMedicines();
  const { data: recentSales, isLoading: loadingRecentSales } = useGetRecentSales();

  const alertCount = (summary?.lowStockCount ?? 0) + (summary?.expiringSoonCount ?? 0);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <h1
          className="text-2xl font-bold text-foreground tracking-tight"
          data-testid="text-dashboard-title"
        >
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live overview of clinic operations.
        </p>
      </div>

      {/* ── Stat cards — 2 cols mobile, 4 desktop ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Medicines"
          value={summary?.totalMedicines}
          icon={Pill}
          loading={loadingSummary}
          accent="blue"
          testid="stat-medicines"
        />
        <StatCard
          title="Sales Today"
          value={summary?.totalSalesToday}
          icon={TrendingUp}
          loading={loadingSummary}
          accent="green"
          trend="+12%"
          testid="stat-sales"
        />
        <StatCard
          title="Revenue Today"
          value={summary ? `₦${Number(summary.totalRevenueToday).toLocaleString()}` : undefined}
          icon={Receipt}
          loading={loadingSummary}
          accent="blue"
          testid="stat-revenue"
        />
        <StatCard
          title="Alerts"
          value={alertCount}
          icon={AlertTriangle}
          loading={loadingSummary}
          accent={alertCount > 0 ? "red" : "blue"}
          testid="stat-alerts"
        />
      </div>

      {/* ── Chart + alerts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Revenue area chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border card-lift p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Revenue Overview</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last 7 days</p>
            </div>
          </div>

          {loadingSales ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : salesByDay && salesByDay.length > 0 ? (
            /*
             * Fixed height prevents the Recharts -1px bug.
             * AreaChart + Area gives the gradient fill per style guide.
             * The <defs> linearGradient fades from primary/15 to transparent.
             */
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart
                data={salesByDay}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#2F80ED" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#2F80ED" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontFamily: "Inter, system-ui, sans-serif" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`
                  }
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotoneX"
                  dataKey="totalRevenue"
                  stroke="#2F80ED"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: "#2F80ED",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              No sales data yet.
            </div>
          )}
        </div>

        {/* Alert panels — stacked */}
        <div className="flex flex-col gap-4">

          {/* Low stock */}
          <div className="bg-card rounded-xl border border-border card-lift p-4 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-[#EB5757]/10">
                <AlertTriangle className="h-4 w-4 text-[#EB5757]" strokeWidth={1.8} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Low Stock</h3>
            </div>
            <div className="space-y-2 max-h-[130px] overflow-auto">
              {loadingLowStock ? (
                <Skeleton className="h-8 w-full" />
              ) : lowStock && lowStock.length > 0 ? (
                lowStock.map(med => (
                  <div
                    key={med.id}
                    className="flex justify-between items-center"
                    data-testid={`alert-lowstock-${med.id}`}
                  >
                    <p className="text-sm text-foreground truncate pr-2">{med.name}</p>
                    <Badge className="bg-[#EB5757]/10 text-[#EB5757] border-0 font-mono text-[10px] flex-shrink-0">
                      {med.quantity}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">All stock levels healthy.</p>
              )}
            </div>
          </div>

          {/* Expiring soon */}
          <div className="bg-card rounded-xl border border-border card-lift p-4 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-[#F2C94C]/15">
                <Clock className="h-4 w-4 text-amber-600" strokeWidth={1.8} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Expiring Soon</h3>
            </div>
            <div className="space-y-2.5 max-h-[130px] overflow-auto">
              {loadingExpiring ? (
                <Skeleton className="h-8 w-full" />
              ) : expiring && expiring.length > 0 ? (
                expiring.map(med => (
                  <div
                    key={med.id}
                    className="flex flex-col gap-0.5"
                    data-testid={`alert-expiring-${med.id}`}
                  >
                    <p className="text-sm font-medium text-foreground">{med.name}</p>
                    <div className="flex justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(med.expiryDate), "dd MMM yyyy")}
                      </span>
                      <span className="text-[11px] font-mono font-semibold text-amber-600">
                        {med.quantity} left
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No medicines expiring soon.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent sales ── */}
      <div className="bg-card rounded-xl border border-border card-lift p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#2F80ED]/10">
              <Receipt className="h-4 w-4 text-[#2F80ED]" strokeWidth={1.8} />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Recent Sales</h2>
          </div>
        </div>

        {loadingRecentSales ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : recentSales && recentSales.length > 0 ? (
          <div className="divide-y divide-border">
            {recentSales.map(sale => {
              const total = sale.grandTotal ?? sale.totalPrice ?? 0;
              const itemName =
                sale.items?.[0]?.itemName ?? sale.medicine?.name ?? "Unknown";
              const count = sale.items?.length ?? 1;

              return (
                <div
                  key={sale.id}
                  className="flex justify-between items-center py-3 first:pt-0 last:pb-0"
                  data-testid={`recent-sale-${sale.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{itemName}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(sale.createdAt), "dd MMM · h:mm a")}
                      {count > 1 && (
                        <span className="ml-2 text-[#2F80ED] font-medium">
                          +{count - 1} more
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-bold font-mono text-foreground">
                      ₦{Number(total).toLocaleString()}
                    </p>
                    {sale.paymentMethod && (
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                        {sale.paymentMethod}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No recent sales.
          </p>
        )}
      </div>
    </div>
  );
}