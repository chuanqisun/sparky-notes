export async function loadFonts(...fontNames: FontName[]) {
  await Promise.all(fontNames.map((fontName) => figma.loadFontAsync(fontName)));
}
