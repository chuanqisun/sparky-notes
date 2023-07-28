import { read, utils } from "xlsx";
import type { RuntimePlugin } from "../../lang/runtime";

export function fileImportPlugin(): RuntimePlugin {
  return {
    operator: "/file/import",
    description: "Import a file",
    run: async (_data, _operand, context) => {
      context.setStatus("Open file picker...");

      const [fileHandle] = (await (window as any).showOpenFilePicker({
        types: [
          {
            description: "Tabular data",
            accept: {
              "application/json": [".json"],
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            },
          },
        ],
      })) as FileSystemFileHandle[];

      const file = await fileHandle.getFile();
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

  const rows = utils.sheet_to_json(activeSheet, { defval: null, skipHidden: true });
  console.log("Rows loaded", rows);
  return rows;
}
