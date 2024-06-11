import "./progress-bar.css";

export interface ProgressBarProps {
  inline?: boolean;
}

export function ProgressBar(props: ProgressBarProps) {
  const classes = ["c-progress-bar", ...(props.inline ? ["c-progress-bar--inline"] : [])];
  return <div class={classes.join(" ")} />;
}
