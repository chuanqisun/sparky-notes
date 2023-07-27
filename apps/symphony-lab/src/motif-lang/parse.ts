export interface MotifProgram {
  statements: MotifStatement[];
}

export interface MotifStatement {
  operator: string;
  operand: string;
}

/**
 * Motif grammar
 *
 * program ::= statement+
 * statement ::= operator operand?
 * operator ::= segment+
 * segment ::= '/'alphaNumeric+
 * alphaNumeric ::= [a-zA-Z0-9]
 * operand ::= string
 *
 * Whitespace is insignificant
 */

export function parseProgram(input: string): MotifProgram {
  const operatorStarIndices = [...input.matchAll(/\//g)].map((match) => match.index);
  if (!operatorStarIndices.length) throw new Error(`The program has no statement`);
  if (operatorStarIndices[0] !== 0) throw new Error(`The program is missing an operator at the beginning`);

  const statements = operatorStarIndices.reduce<MotifStatement[]>((statements, operatorStarIndex, index) => {
    const nextOperatorStarIndex = operatorStarIndices[index + 1];
    const statement = input.slice(operatorStarIndex, nextOperatorStarIndex);
    const operator = statement.match(/\/[a-zA-Z0-9]+/)?.[0].trim();
    if (!operator) throw new Error(`Invalid indentifier at the beginning of the statement: "${statement}"`);
    const operand = statement.slice(operator.length).trim();
    statements.push({ operator, operand });

    return statements;
  }, []);

  return { statements };
}
