export async function ensureStickyFont() {
  const dummyStikcy = figma.createSticky();
  const dummyText = figma.createText();
  await Promise.all([figma.loadFontAsync(dummyStikcy.text.fontName as FontName), figma.loadFontAsync(dummyText.fontName as FontName)]);
  dummyStikcy.remove();
}
