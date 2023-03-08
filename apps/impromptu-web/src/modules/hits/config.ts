import { parseJwtBody } from "./jwt";

export interface HitsConfig {
  accessToken: string;
}

export function formToHitsConfig(form: HTMLFormElement): HitsConfig {
  const formData = new FormData(form);
  return {
    accessToken: formData.get("hitsToken") as string,
  };
}

export function hitsConfigToForm(form: HTMLFormElement, connection: Partial<HitsConfig>) {
  let hasError = false;
  if (connection.accessToken) {
    form.querySelector<HTMLInputElement>(`[name="hitsToken"]`)!.value = connection.accessToken;

    try {
      const body = parseJwtBody(connection.accessToken);
      form.querySelector<HTMLInputElement>(`[name="hitsTokenExp"]`)!.value = new Date(body.exp * 1000).toLocaleString();
      if (body.exp * 1000 < Date.now()) {
        hasError = true;
      }
    } catch (e) {
      form.querySelector<HTMLInputElement>(`[name="hitsTokenExp"]`)!.value = "Invalid token";
      hasError = true;
    }
  } else {
    form.querySelector<HTMLInputElement>(`[name="hitsTokenExp"]`)!.value = "Missing token";
    hasError = true;
  }

  form.querySelector<HTMLInputElement>(`[name="hitsTokenExp"]`)!.style.color = hasError ? "red" : "green";
}
