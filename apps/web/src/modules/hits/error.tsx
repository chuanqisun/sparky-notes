export function ErrorMessage() {
  return (
    <p>
      Sorry, something went wrong. You can <a href={window.location.href}>click here to reload the page</a>, or visit{" "}
      <a href="https://hits.microsoft.com" target="_blank">
        https://hits.microsoft.com
      </a>{" "}
      for the latest content.
    </p>
  );
}
