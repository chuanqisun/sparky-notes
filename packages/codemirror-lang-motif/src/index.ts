import { completeFromList, type Completion } from "@codemirror/autocomplete";
import { LanguageSupport, LRLanguage } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { parser } from "./parser";

const parserWithMetadata = parser.configure({
  props: [
    styleTags({
      "Path/Segment": t.keyword,
      Char: t.string,
      Number: t.number,
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

export interface MotifOptions {
  runtimeCompletions: Completion[];
}
export function motif(options: MotifOptions) {
  return new LanguageSupport(motifLanguage, [motifBuiltinCompletion, motifRuntimeCompletion(options.runtimeCompletions)]);
}
