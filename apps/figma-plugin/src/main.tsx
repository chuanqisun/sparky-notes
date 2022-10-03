async function main() {
  figma.showUI(`<script>window.location.href="${process.env.WEB_URL}"</script>`, {
    height: 800,
    width: 420,
  });
  figma.ui.onmessage = (msg) => {};
}

main();
