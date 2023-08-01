import { completeFromList, type Completion } from "@codemirror/autocomplete";
import { foldInside, foldNodeProp, indentNodeProp, LanguageSupport, LRLanguage } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { parser } from "./parser";

const parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Identifier: t.keyword,
      String: t.string,
      Number: t.number,
    }),
    indentNodeProp.add({
      Application: (context) => context.column(context.node.from) + context.unit,
    }),
    foldNodeProp.add({
      Application: foldInside,
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
