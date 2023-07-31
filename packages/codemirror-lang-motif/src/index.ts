import { completeFromList } from "@codemirror/autocomplete";
import { LRLanguage, LanguageSupport, foldInside, foldNodeProp, indentNodeProp } from "@codemirror/language";
import { styleTags, tags as t } from "@lezer/highlight";
import { parser } from "./parser";

const parserWithMetadata = parser.configure({
  props: [
    styleTags({
      Identifier: t.variableName,
      Boolean: t.bool,
      String: t.string,
      LineComment: t.lineComment,
      "( )": t.paren,
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
  languageData: {
    commentTokens: { line: ";" },
  },
});

export const motifCompletion = motifLanguage.data.of({
  autocomplete: completeFromList([
    { label: "defun", type: "keyword" },
    { label: "defvar", type: "keyword" },
    { label: "let", type: "keyword" },
    { label: "cons", type: "function" },
    { label: "car", type: "function" },
    { label: "cdr", type: "function" },
  ]),
});

export function motif() {
  return new LanguageSupport(motifLanguage, [motifCompletion]);
}
