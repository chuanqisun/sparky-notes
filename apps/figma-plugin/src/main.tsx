async function main() {
  figma.showUI(`<script>window.location.href="${process.env.WEB_URL}"</script>`);
  figma.ui.onmessage = (msg) => {};
}

main();
