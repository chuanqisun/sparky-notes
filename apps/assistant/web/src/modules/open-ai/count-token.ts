// return estimated token count for GTP-2 or GTP-3
export function estimateToken(text: string) {
  const gpt2TokenDelimiterRegex = /[\s+.,!?]/g;
  const tokens = text.replace(gpt2TokenDelimiterRegex, " ").split(" ");
  return Math.round(tokens.length * 1.3);
}
