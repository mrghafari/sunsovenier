import writeXlsxFile, { type Cell } from "write-excel-file/browser";

type ExcelValue = string | number | boolean | Date | null | undefined;

export async function exportRecordsToXlsx(
  records: Array<Record<string, ExcelValue>>,
  fileName: string,
  sheetName: string,
  columnWidths?: number[],
): Promise<void> {
  if (records.length === 0) {
    return;
  }

  const headers = Object.keys(records[0]);
  const headerRow: Cell[] = headers.map((header) => ({
    value: header,
    fontWeight: "bold",
  }));
  const dataRows: Cell[][] = records.map((record) =>
    headers.map((header) => {
      const value = record[header];
      return { value: value ?? "" };
    }),
  );

  const options = {
    sheet: sheetName,
    ...(columnWidths
      ? { columns: columnWidths.map((width) => ({ width })) }
      : {}),
  };

  await writeXlsxFile([headerRow, ...dataRows], options).toFile(fileName);
}