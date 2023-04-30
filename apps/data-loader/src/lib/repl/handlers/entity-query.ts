import type { CozoDb } from "cozo-node";

export async function entityQueryHandler(db: CozoDb, command: string) {
  if (!command.startsWith("e:")) return;

  const query = command.replace("e:", "").trim();

  console.log(query);
}
