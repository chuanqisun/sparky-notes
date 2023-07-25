import type { ShelfDirective } from "./base-directive";

export function createHitsDirective(): ShelfDirective {
  return {
    match: (source) => source.startsWith("/hits"),
    run: async () => {
      const [fileHandle] = (await (window as any).showOpenFilePicker()) as FileSystemFileHandle[];
      const file = await fileHandle.getFile();
      const jsonText = await file.text();
      try {
        return {
          data: JSON.parse(jsonText),
        };
      } catch {
        return {
          status: "Invalid JSON file",
        };
      }
    },
  };
}
