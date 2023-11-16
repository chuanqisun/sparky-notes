import { filter, tap, type Observable } from "rxjs";

export function setMenuIsOpen(menuRoot: HTMLDetailsElement, isOpen: boolean) {
  menuRoot.open = isOpen;
}

export function useAppMenu(props: { container: HTMLDetailsElement; $isTokenValid: Observable<undefined | boolean> }) {
  props.$isTokenValid
    .pipe(
      filter((isValid) => isValid === false),
      tap(() => setMenuIsOpen(props.container, true))
    )
    .subscribe();
}
