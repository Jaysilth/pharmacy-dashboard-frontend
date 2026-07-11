import { useState } from "react";
import { useGetRevenueByPeriod, type RevenuePeriod } from "@/lib/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// Matches the dashboard's revenue chart tooltip exactly, so the two
// charts in the app read as the same visual language.
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { label: string; periodStart: string; periodEnd: string; totalRevenue: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-lg text-sm">
      <p className="text-muted-foreground mb-1 text-xs font-medium">{bucket.label}</p>
      <p className="text-foreground font-bold font-mono text-base">
        ₦{Number(bucket.totalRevenue).toLocaleString()}
      </p>
    </div>
  );
}

const PERIOD_OPTIONS: { value: RevenuePeriod; label: string; count: number }[] = [
  { value: "week",  label: "Weekly",  count: 12 }, // last 12 ISO calendar weeks (Mon–Sun)
  { value: "month", label: "Monthly", count: 12 }, // last 12 calendar months
  { value: "year",  label: "Yearly",  count: 5 },  // last 5 calendar years
];

export default function Revenue() {
  const [period, setPeriod] = useState<RevenuePeriod>("month");
  const activeOption = PERIOD_OPTIONS.find((o) => o.value === period)!;
  const { data, isLoading } = useGetRevenueByPeriod(period, activeOption.count);

  const totalForRange = data?.reduce((sum, b) => sum + Number(b.totalRevenue), 0) ?? 0;
  const bestBucket = data && data.length > 0
    ? data.reduce((best, b) => (Number(b.totalRevenue) > Number(best.totalRevenue) ? b : best))
    : null;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-foreground tracking-tight"
            data-testid="text-revenue-title"
          >
            Revenue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue over time, grouped by calendar {period}.
          </p>
        </div>

        {/* Week / Month / Year toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1 self-start">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={period === opt.value ? "default" : "ghost"}
              className="rounded-lg text-xs font-semibold px-4"
              onClick={() => setPeriod(opt.value)}
              data-testid={`revenue-period-${opt.value}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="card-lift bg-card rounded-2xl p-6 flex items-center justify-between border border-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              Total over range
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <p className="text-2xl font-bold text-foreground leading-none" data-testid="revenue-total-value">
                ₦{totalForRange.toLocaleString()}
              </p>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <TrendingUp className="h-5 w-5" strokeWidth={1.8} />
          </div>
        </div>

        <div className="card-lift bg-card rounded-2xl p-6 flex items-center justify-between border border-border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
              Best {period}
            </p>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : bestBucket ? (
              <>
                <p className="text-2xl font-bold text-foreground leading-none">
                  ₦{Number(bestBucket.totalRevenue).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{bestBucket.label}</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-foreground leading-none">—</p>
            )}
          </div>
          <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
            <Calendar className="h-5 w-5" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="bg-card rounded-2xl border border-border card-lift p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Revenue Trend</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last {activeOption.count} calendar {period}{activeOption.count > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-[280px] w-full rounded-xl" />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="revenuePeriodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#2F80ED" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#2F80ED" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
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
                tickFormatter={(v: number) => (v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`)}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotoneX"
                dataKey="totalRevenue"
                stroke="#2F80ED"
                strokeWidth={2.5}
                fill="url(#revenuePeriodGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-12 text-center">No revenue recorded for this range.</p>
        )}
      </div>

      {/* ── Breakdown table — exact figures per bucket, since bars/tooltips
           alone aren't precise enough for someone doing real bookkeeping ── */}
      <div className="bg-card rounded-2xl border border-border card-lift overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Breakdown</h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : data && data.length > 0 ? (
          <div className="divide-y divide-border">
            {[...data].reverse().map((bucket) => (
              <div
                key={bucket.periodStart}
                className="flex items-center justify-between px-6 py-3 text-sm"
                data-testid={`revenue-row-${bucket.periodStart}`}
              >
                <span className="text-foreground font-medium">{bucket.label}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {bucket.periodStart} – {bucket.periodEnd}
                </span>
                <span className="text-foreground font-mono font-semibold">
                  ₦{Number(bucket.totalRevenue).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No data yet.</p>
        )}
      </div>
    </div>
  );
}
