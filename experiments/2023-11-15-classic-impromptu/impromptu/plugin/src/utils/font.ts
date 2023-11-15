export async function ensureStickyFont() {
  const dummyStikcy = figma.createSticky();
  const dummyText = figma.createText();
  await Promise.all([
    figma.loadFontAsync(dummyStikcy.text.fontName as FontName).then(() => dummyStikcy.remove()),
    figma.loadFontAsync(dummyText.fontName as FontName).then(() => dummyText.remove()),
  ]);
}
