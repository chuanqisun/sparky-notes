import { html, render } from "lit-html";
import { ReplaySubject, Subject, combineLatestWith, distinct, filter, first, map, startWith, tap, type Observable } from "rxjs";
import type { MessageFromFigma, MessageFromUI } from "../../../types/message";
import { parseJwt } from "./jwt";

export function useAuthForm(props: { $rx: Observable<MessageFromFigma>; $tx: Subject<MessageFromUI>; container: HTMLElement }) {
  const handleRenew = () => window.open("https://hits.microsoft.com", "_blank");

  const $tokenInput = new Subject<string>();

  // init token input value from stored
  props.$rx
    .pipe(
      filter((msg) => typeof msg.token === "string"),
      map((msg) => msg.token!),
      distinct(),
      first(),
      tap()
    )
    .subscribe((token) => $tokenInput.next(token));

  const $isTokenValid: Observable<undefined | boolean> = $tokenInput.pipe(
    map(getMinutesLeft),
    map((t) => t !== null && t > 0),
    startWith(undefined)
  );

  // render token input
  $tokenInput
    .pipe(
      map(getMinutesLeft),
      map(getTokenStatusLabel),
      combineLatestWith($tokenInput),
      tap(([label, token]) => {
        render(
          html`
            <label for="access-token">Access token (${label})</label>
            <br />
            <input
              id="access-token"
              name="access-token"
              type="password"
              .value=${token}
              @input=${(e: KeyboardEvent) => $tokenInput.next((e.target as HTMLInputElement).value)}
            />
            <button data-action="renew-token" @click=${handleRenew}>Renew</button>
          `,
          props.container
        );
      })
    )
    .subscribe();

  const $validTokenInternal = new ReplaySubject<string>(1);
  $tokenInput
    .pipe(
      filter((t) => {
        const minutesLeft = getMinutesLeft(t);
        return minutesLeft !== null && minutesLeft > 0;
      })
    )
    .subscribe($validTokenInternal);
  const $validToken = $validTokenInternal.asObservable();

  $tokenInput.pipe(map((token) => ({ setAccessToken: token }))).subscribe(props.$tx);

  return {
    /** emits undefined first, then either true/false depending on whether token is unexpired */
    $isTokenValid,
    /** Emits the current valid token as soon as subscribed, then re-emit when token is updated */
    $validToken,
  };
}

function getMinutesLeft(token: string): number | null {
  const parsed = parseJwt(token);
  if (parsed === null) return null;
  const remainingMin = Math.floor((parsed.exp - Date.now() / 1000) / 60);
  return remainingMin;
}

function getTokenStatusLabel(minutesLeft: number | null): string {
  if (minutesLeft === null) return "missing";
  return `${minutesLeft !== null && minutesLeft > 1 ? `${minutesLeft} min left` : "expired"}`;
}
