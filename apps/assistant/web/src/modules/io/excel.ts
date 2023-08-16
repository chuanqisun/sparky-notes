import { read, utils } from "xlsx";

export async function importExcel(file: File) {
  const sheet = read(await file.arrayBuffer());
  console.log("Sheet loaded", sheet);

  const activeSheet = sheet.Sheets[sheet.SheetNames[0]];
  if (!activeSheet) return;

  const rows = utils.sheet_to_json(activeSheet, { defval: null });
  console.log("Rows loaded", rows);
  return rows;
}
