import { of, tap } from "rxjs";

export const $focusOnce = (focusable: { focus: () => any }) => of(tap(() => focusable.focus()));
