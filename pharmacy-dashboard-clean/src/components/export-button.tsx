import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

/**
 * Consistent "Export to Excel" button for any page. Pass a function that
 * does the actual export (usually a call to exportToExcel from
 * @/lib/export-excel) — this component just standardizes the look and
 * label so it's the same across every page instead of reinvented per file.
 */
export function ExportButton({
  onExport,
  label = "Export",
  disabled = false,
  testId,
}: {
  onExport: () => void;
  label?: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs font-semibold"
      onClick={onExport}
      disabled={disabled}
      data-testid={testId}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
