import { useState } from "react";
import { useGetConsumables, useRecordConsumableUsage } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { ConsumableUsageInput } from "@/types/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Minus, Trash2, Package, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageLine {
  consumableId: number;
  consumableName: string;
  unit: string;
  quantityUsed: number;
  available: number;
}

interface Props {
  /** Which clinical context this widget is embedded in */
  linkedEntityType: "SURGERY" | "PROCEDURE" | "LAB_TEST";
  /** DB ID — only valid for SURGERY */
  surgeryId?: number;
  /** Name string — for PROCEDURE and LAB_TEST (localStorage-backed) */
  entityRef?: string;
  /** Optional: show as compact inline section rather than full card */
  compact?: boolean;
}

export function ConsumableUsageWidget({
  linkedEntityType,
  surgeryId,
  entityRef,
  compact = false,
}: Props) {
  const { toast } = useToast();
  const { data: consumables } = useGetConsumables();
  const recordUsage = useRecordConsumableUsage();

  const [lines, setLines] = useState<UsageLine[]>([]);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const filtered = consumables?.filter(
    c =>
      c.quantityInStock > 0 &&
      !lines.some(l => l.consumableId === c.id) &&
      (search === "" || c.name.toLowerCase().includes(search.toLowerCase())),
  ) ?? [];

  const addLine = (c: { id: number; name: string; unit: string; quantityInStock: number }) => {
    setLines(prev => [
      ...prev,
      { consumableId: c.id, consumableName: c.name, unit: c.unit, quantityUsed: 1, available: c.quantityInStock },
    ]);
    setSearch("");
    setShowPicker(false);
  };

  const updateQty = (idx: number, delta: number) => {
    setLines(prev =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = Math.max(1, Math.min(l.available, l.quantityUsed + delta));
        return { ...l, quantityUsed: next };
      }),
    );
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (lines.length === 0) {
      toast({ title: "Add at least one consumable before recording.", variant: "destructive" });
      return;
    }

    // Fire one mutation per consumable (parallel)
    const requests: ConsumableUsageInput[] = lines.map(l => ({
      consumableId: l.consumableId,
      quantityUsed: l.quantityUsed,
      linkedEntityType,
      surgeryId:    linkedEntityType === "SURGERY"   ? surgeryId   : undefined,
      procedureRef: linkedEntityType === "PROCEDURE" ? entityRef   : undefined,
      labTestRef:   linkedEntityType === "LAB_TEST"  ? entityRef   : undefined,
    }));

    let completed = 0;
    let failed = 0;

    requests.forEach(req => {
      recordUsage.mutate(req, {
        onSuccess: () => {
          completed++;
          if (completed + failed === requests.length) {
            if (failed === 0) {
              toast({ title: `${completed} consumable${completed > 1 ? "s" : ""} recorded.` });
              setLines([]);
            } else {
              toast({
                title: `${completed} recorded, ${failed} failed.`,
                variant: "destructive",
              });
            }
          }
        },
        onError: (err) => {
          failed++;
          const msg = err instanceof ApiError ? err.message : String(err);
          toast({ title: "Usage error", description: msg, variant: "destructive" });
          if (completed + failed === requests.length && completed > 0) {
            setLines(lines.filter(l => !requests.slice(0, completed).some(r => r.consumableId === l.consumableId)));
          }
        },
      });
    });
  };

  const content = (
    <div className="space-y-3">
      {/* Lines already added */}
      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div
              key={line.consumableId}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/20"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{line.consumableName}</p>
                <p className="text-xs text-muted-foreground">
                  {line.unit} · {line.available} available
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(idx, -1)}
                  className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-mono font-semibold w-6 text-center">
                  {line.quantityUsed}
                </span>
                <button
                  onClick={() => updateQty(idx, 1)}
                  disabled={line.quantityUsed >= line.available}
                  className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  onClick={() => removeLine(idx)}
                  className="ml-1 text-destructive hover:text-destructive/70"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Picker */}
      {showPicker ? (
        <div className="space-y-2">
          <Input
            autoFocus
            placeholder="Search consumables…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
          />
          <div className="max-h-[180px] overflow-auto rounded-xl border border-border divide-y divide-border">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {search ? `No match for "${search}".` : "All consumables in stock added."}
              </p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => addLine(c)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
                >
                  <span className="font-medium">{c.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{c.quantityInStock} {c.unit}</span>
                    {c.lowStock && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Low
                      </Badge>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowPicker(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setShowPicker(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Add Consumable
        </Button>
      )}

      {/* Submit */}
      {lines.length > 0 && !showPicker && (
        <Button
          size="sm"
          className="w-full"
          disabled={recordUsage.isPending}
          onClick={handleSubmit}
        >
          {recordUsage.isPending
            ? "Recording…"
            : `Record ${lines.length} Consumable${lines.length > 1 ? "s" : ""}`}
        </Button>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" /> Consumables Used
        </p>
        {content}
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-5">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Consumables Used
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4">{content}</CardContent>
    </Card>
  );
}