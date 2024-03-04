import { completeFromList, type Completion } from "@codemirror/autocomplete";
import { HighlightStyle, LanguageSupport, LRLanguage, syntaxHighlighting } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { parser } from "./parser";

const parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Divider: t.keyword,
      Segment: t.keyword,
      Char: t.string,
      Number: t.number,
      Symbol: t.punctuation,
    }),
  ],
});

export const motifLanguage = LRLanguage.define({
  parser: parserWithMetadata,
  languageData: {},
});

export const motifBuiltinCompletion = motifLanguage.data.of({
  autocomplete: completeFromList([]),
});

export function motifRuntimeCompletion(list: Completion[]) {
  return motifLanguage.data.of({
    autocomplete: completeFromList(list),
  });
}

export function motifLightTheme() {
  return syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.keyword, color: "#a626a4" },
      { tag: t.number, color: "#4078f2" },
      { tag: t.string, color: "#696c77" },
      { tag: t.punctuation, color: "#696c77" },
    ])
  );
}

export interface MotifOptions {
  runtimeCompletions: Completion[];
}
export function motif(options: MotifOptions) {
  return new LanguageSupport(motifLanguage, [motifBuiltinCompletion, motifRuntimeCompletion(options.runtimeCompletions), motifLightTheme()]);
}
