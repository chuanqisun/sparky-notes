import "./welcome.css";
export interface WelcomeProps {
  onSignIn: () => void;
}
export function Welcome(props: WelcomeProps) {
  return (
    <section class="c-welcome-mat">
      <h1 class="c-welcome-title">Welcome to HITS Assistant</h1>
      <div class="c-welcome-action-group">
        <button class="u-reset c-jumbo-button" onClick={props.onSignIn}>
          Sign in
        </button>
      </div>
    </section>
  );
}
