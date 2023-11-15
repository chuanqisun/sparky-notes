import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

export async function startRepl(matchers: ReplHandler[] = []) {
  const rl = readline.createInterface({ input, output });

  await replNext(rl, matchers);
}

export type ReplHandler = (command: string) => any;

async function replNext(rl: readline.Interface, handlers: ReplHandler[] = []) {
  const answer = await rl.question("💬 ");

  if (answer === "exit" || answer === "q") {
    rl.close();
  } else {
    await Promise.all(
      handlers.map(async (handler) => {
        try {
          await handler(answer);
        } catch (e) {
          console.error(e);
        }
      })
    );
    replNext(rl, handlers);
  }
}
