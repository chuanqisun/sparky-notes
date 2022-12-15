export function setJson(namespace: string, config: any) {
  localStorage.setItem(namespace, JSON.stringify(config));
}

export function getJson<T = any>(namespace: string): T | null {
  try {
    const config = localStorage.getItem(namespace);
    return config ? JSON.parse(config) : null;
  } catch {
    return null;
  }
}
