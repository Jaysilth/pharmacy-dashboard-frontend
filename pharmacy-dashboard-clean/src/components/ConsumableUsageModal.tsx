import { useState } from "react";
import { useGetConsumables, useGetSurgeries, useRecordConsumableUsage } from "@/lib/queries";
import { useClinical } from "@/context/ClinicalContext";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import type { ConsumableUsageInput } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, Trash2, ClipboardList } from "lucide-react";

type UsedForType = "SURGERY" | "PROCEDURE" | "LAB_TEST";

interface UsageLine {
  consumableId: number;
  consumableName: string;
  unit: string;
  quantityUsed: number;
  available: number;
}

export function ConsumableUsageModal({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const { data: consumables } = useGetConsumables(undefined, { enabled: open });
  const { data: surgeries } = useGetSurgeries(undefined, { enabled: open });
  const { procedures, labTests } = useClinical();
  const recordUsage = useRecordConsumableUsage();

  // ── "Used for" selection ──────────────────────────────────────────────────
  const [usedForType, setUsedForType] = useState<UsedForType | "">("");
  const [surgeryId, setSurgeryId] = useState<string>("");
  const [procedureRef, setProcedureRef] = useState<string>("");
  const [labTestRef, setLabTestRef] = useState<string>("");

  // ── Shared fields ──────────────────────────────────────────────────────────
  const [usedBy, setUsedBy] = useState("");
  const [notes, setNotes] = useState("");

  // ── Multi-line consumable picker (same UX as ConsumableUsageWidget) ────────
  const [lines, setLines] = useState<UsageLine[]>([]);
  const [search, setSearch] = useState("");
  const [showPicker, setShowPicker] = useState(false);

  const filtered = consumables?.filter(
    c =>
      c.quantityInStock > 0 &&
      !lines.some(l => l.consumableId === c.id) &&
      (search === "" || c.name.toLowerCase().includes(search.toLowerCase())),
  ) ?? [];

  const resetAll = () => {
    setUsedForType(""); setSurgeryId(""); setProcedureRef(""); setLabTestRef("");
    setUsedBy(""); setNotes(""); setLines([]); setSearch(""); setShowPicker(false);
  };

  const onOpenChange = (v: boolean) => { setOpen(v); if (v) resetAll(); };

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

  const targetChosen =
    usedForType === "SURGERY"   ? !!surgeryId :
    usedForType === "PROCEDURE" ? !!procedureRef :
    usedForType === "LAB_TEST"  ? !!labTestRef : false;

  const canSubmit = usedForType !== "" && targetChosen && lines.length > 0 && !recordUsage.isPending;

  const handleSubmit = () => {
    if (!usedForType) {
      toast({ title: "Select what this was used for.", variant: "destructive" });
      return;
    }
    if (!targetChosen) {
      toast({ title: `Select the ${usedForType.toLowerCase().replace("_", " ")}.`, variant: "destructive" });
      return;
    }
    if (lines.length === 0) {
      toast({ title: "Add at least one consumable before recording.", variant: "destructive" });
      return;
    }

    const requests: ConsumableUsageInput[] = lines.map(l => ({
      consumableId: l.consumableId,
      quantityUsed: l.quantityUsed,
      usedBy: usedBy || undefined,
      notes: notes || undefined,
      linkedEntityType: usedForType,
      surgeryId:    usedForType === "SURGERY"   ? Number(surgeryId) : undefined,
      procedureRef: usedForType === "PROCEDURE" ? procedureRef      : undefined,
      labTestRef:   usedForType === "LAB_TEST"  ? labTestRef        : undefined,
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
              setOpen(false);
            } else {
              toast({ title: `${completed} recorded, ${failed} failed.`, variant: "destructive" });
            }
          }
        },
        onError: (err) => {
          failed++;
          const msg = err instanceof ApiError ? err.message : String(err);
          toast({ title: "Usage error", description: msg, variant: "destructive" });
        },
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <ClipboardList className="mr-2 h-4 w-4" /> Record Usage
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Record Consumable Usage</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">

          {/* ── What it was used for ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Used For</Label>
              <Select
                value={usedForType}
                onValueChange={(v) => {
                  setUsedForType(v as UsedForType);
                  setSurgeryId(""); setProcedureRef(""); setLabTestRef("");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SURGERY">Surgery</SelectItem>
                  <SelectItem value="PROCEDURE">Procedure</SelectItem>
                  <SelectItem value="LAB_TEST">Lab Test</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{usedForType === "SURGERY" ? "Surgery" : usedForType === "PROCEDURE" ? "Procedure" : usedForType === "LAB_TEST" ? "Lab Test" : "Target"}</Label>
              {usedForType === "SURGERY" && (
                <Select value={surgeryId} onValueChange={setSurgeryId}>
                  <SelectTrigger><SelectValue placeholder="Select surgery" /></SelectTrigger>
                  <SelectContent>
                    {surgeries?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {usedForType === "PROCEDURE" && (
                <Select value={procedureRef} onValueChange={setProcedureRef}>
                  <SelectTrigger><SelectValue placeholder="Select procedure" /></SelectTrigger>
                  <SelectContent>
                    {procedures.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {usedForType === "LAB_TEST" && (
                <Select value={labTestRef} onValueChange={setLabTestRef}>
                  <SelectTrigger><SelectValue placeholder="Select lab test" /></SelectTrigger>
                  <SelectContent>
                    {labTests.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {usedForType === "" && (
                <div className="h-9 rounded-md border border-dashed border-border flex items-center px-3 text-xs text-muted-foreground">
                  Pick a type first
                </div>
              )}
            </div>
          </div>

          {/* ── Consumable lines ── */}
          <div className="space-y-2">
            <Label>Consumables</Label>

            {lines.length > 0 && (
              <div className="space-y-2">
                {lines.map((line, idx) => (
                  <div
                    key={line.consumableId}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-border bg-muted/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{line.consumableName}</p>
                      <p className="text-xs text-muted-foreground">{line.unit} · {line.available} available</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(idx, -1)} className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-mono font-semibold w-6 text-center">{line.quantityUsed}</span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        disabled={line.quantityUsed >= line.available}
                        className="h-6 w-6 rounded border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button onClick={() => removeLine(idx)} className="ml-1 text-destructive hover:text-destructive/70">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showPicker ? (
              <div className="space-y-2">
                <Input
                  autoFocus
                  placeholder="Search consumables…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-9"
                />
                <div className="max-h-[160px] overflow-auto rounded-xl border border-border divide-y divide-border">
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
                          {c.lowStock && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Low</Badge>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowPicker(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setShowPicker(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Consumable
              </Button>
            )}
          </div>

          {/* ── Shared fields ── */}
          <div className="space-y-1.5">
            <Label>Used By (optional)</Label>
            <Input placeholder="Staff name" value={usedBy} onChange={e => setUsedBy(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea className="resize-none" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
              {recordUsage.isPending
                ? "Recording…"
                : `Record ${lines.length || ""} Consumable${lines.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
