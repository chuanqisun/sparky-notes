export function displayError(e: any) {
  console.log(e.display ?? e.message ?? e);
  throw e;
}
