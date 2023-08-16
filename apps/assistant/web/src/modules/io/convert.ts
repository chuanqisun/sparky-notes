import { importExcel } from "./excel";
import { importJson } from "./json";

export async function convertFileByExtension(file: File) {
  const ext = file.name.split(".").pop();
  switch (ext) {
    case "json":
      return await importJson(file);
    case "xlsx":
      return await importExcel(file);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
