import type { ShelfDirective } from "./base-directive";

export function createExportDirective(): ShelfDirective {
  return {
    match: (source) => source.startsWith("/export"),
    run: async ({ updateStatus: setStatus, data }) => {
      const [fileHandle] = (await (window as any).showSaveFilePicker()) as FileSystemFileHandle[];
      const file = await fileHandle.createWritable();
      await file.write(JSON.stringify(data));
      await file.close();
      setStatus("Exported JSON file");

      return {};
    },
  };
}
