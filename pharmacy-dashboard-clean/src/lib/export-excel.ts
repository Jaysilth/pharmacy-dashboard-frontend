import * as XLSX from "@e965/xlsx";

/**
 * Exports one or more sheets of flat row data to a downloaded .xlsx file.
 *
 * Usage — single sheet:
 *   exportToExcel("medicines", medicines.map(m => ({ Name: m.name, Quantity: m.quantity, Price: m.price })));
 *
 * Usage — multiple sheets in one workbook (e.g. Revenue's 3 tabs):
 *   exportToExcel("revenue-report", [
 *     { sheetName: "Revenue", rows: revenueRows },
 *     { sheetName: "Category Summary", rows: categoryRows },
 *   ]);
 *
 * Column headers come from the keys of each row object, in insertion order —
 * so build the row objects with the exact column names/order you want,
 * don't just spread the raw API entity (that'll dump internal field names
 * like "id" or "createdAt" as columns, which usually isn't what a person
 * opening this in Excel actually wants).
 */
export function exportToExcel(
  filename: string,
  data: Record<string, unknown>[] | { sheetName: string; rows: Record<string, unknown>[] }[]
) {
  const workbook = XLSX.utils.book_new();

  const sheets = Array.isArray(data) && data.length > 0 && "sheetName" in data[0]
    ? (data as { sheetName: string; rows: Record<string, unknown>[] }[])
    : [{ sheetName: "Sheet1", rows: data as Record<string, unknown>[] }];

  sheets.forEach(({ sheetName, rows }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    // Excel sheet names: max 31 chars, no : \ / ? * [ ]
    const safeName = sheetName.replace(/[:\\/?*[\]]/g, "").slice(0, 31) || "Sheet1";
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  });

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}-${today}.xlsx`);
}
