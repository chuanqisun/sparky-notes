import { type RuntimePlugin } from "@h20/motif-lang";
import { read, utils } from "xlsx";

export function fileImportPlugin(): RuntimePlugin {
  return {
    operator: "/import",
    description: "Import a file with one of the supported formats: json, xlsx",
    run: async (_data, _operand, context) => {
      context.setStatus("Open file picker...");

      const files = await new Promise<FileList | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        input.addEventListener("change", (e) => {
          resolve((e.target as HTMLInputElement).files!);
          input.remove();
        });
        input.click();
      });

      if (files === null) return;

      const file = files[0];
      const ext = file.name.split(".").pop();

      let data: any;
      switch (ext) {
        case "json":
          data = await importJson(file);
          break;
        case "xlsx":
          data = await importExcel(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${ext}`);
      }

      context.setItems(data);
      context.setStatus(`Imported: ${file.name}`);
    },
  };
}

async function importJson(file: File) {
  const jsonText = await file.text();
  return JSON.parse(jsonText);
}

async function importExcel(file: File) {
  const sheet = read(await file.arrayBuffer());
  console.log("Sheet loaded", sheet);

  const activeSheet = sheet.Sheets[sheet.SheetNames[0]];
  if (!activeSheet) return;

  const rows = utils.sheet_to_json(activeSheet, { defval: null });
  console.log("Rows loaded", rows);
  return rows;
}
