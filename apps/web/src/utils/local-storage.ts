export function setJson(namespace: string, config: any) {
  localStorage.setItem(namespace, JSON.stringify(config));
}

export function getJson<T = any>(namespace: string, validate?: (result: any) => boolean): T | null {
  try {
    const result = localStorage.getItem(namespace);

    const parsed = result ? JSON.parse(result) : null;

    if (validate && !validate(parsed)) {
      console.log("JSON validation failed");
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
