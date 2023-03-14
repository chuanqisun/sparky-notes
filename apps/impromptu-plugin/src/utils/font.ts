export async function ensureStickyFont() {
  const dummyStikcy = figma.createSticky();
  await figma.loadFontAsync(dummyStikcy.text.fontName as FontName);
  dummyStikcy.remove();
}
