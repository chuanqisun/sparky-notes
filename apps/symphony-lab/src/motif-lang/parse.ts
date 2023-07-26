export interface MotifProgram {
  clauses: MotifClause[];
}

export interface MotifClause {
  operator: string;
  operand: string;
}

/**
 * Motif grammar
 *
 * program ::= clause+
 * clause ::= operator operand?
 * operator ::= segment+
 * segment ::= '/'alphaNumeric+
 * alphaNumeric ::= [a-zA-Z0-9]
 * operand ::= string
 *
 * Whitespace is ignored.
 */

export function parseProgram(input: string): MotifProgram {
  const tokens = input
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (token.startsWith("/")) {
        return { type: "operator", value: token };
      } else {
        return { type: "operand", value: token };
      }
    });

  return tokens.reduce<MotifProgram>(
    (program, token) => {
      if (token.type === "operator") {
        program.clauses.push({ operator: token.value, operand: "" });
        return program;
      }

      const currentClause = program.clauses[program.clauses.length - 1];
      if (!currentClause) throw new Error(`Unexpected operand "${token.value}"`);

      currentClause.operand = token.value;
      return program;
    },
    { clauses: [] }
  );
}
