import type { Cozo } from "../cozo/cozo";

interface ProgramContext {
  db: Cozo;
  data: any;
}
async function main(context: ProgramContext) {
  console.log(context);
  const result = await context.db.mutate(`
?[a, b, c] <- [[1,2,3]]
:replace myList {a, b, c}
  `);

  console.log(result);
}

export const createListProgram = {
  name: "createList",
  main,
};
