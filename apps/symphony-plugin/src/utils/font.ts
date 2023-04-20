export async function ensureFont() {
  const dummyText = figma.createText();
  await Promise.all([figma.loadFontAsync(dummyText.fontName as FontName).then(() => dummyText.remove())]);
}
