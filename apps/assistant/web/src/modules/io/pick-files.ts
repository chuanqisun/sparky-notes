export interface UploadConfig {
  multiple?: boolean;
  accept: string;
}
export async function pickFiles(config: UploadConfig): Promise<File[]> {
  const files = await new Promise<FileList | null>((resolve) => {
    const input = document.createElement("input");
    input.multiple = config.multiple ?? false;
    input.type = "file";
    input.accept = "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    input.addEventListener("change", (e) => {
      resolve((e.target as HTMLInputElement).files!);
      input.remove();
    });
    input.click();
  });

  if (!files) return [];

  return [...files];
}
