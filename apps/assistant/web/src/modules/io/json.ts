export async function importJson(file: File) {
  const jsonText = await file.text();
  return JSON.parse(jsonText);
}
