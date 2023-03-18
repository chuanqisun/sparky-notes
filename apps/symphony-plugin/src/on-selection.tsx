import type { InjectedContext } from "./main";

declare var context: InjectedContext;

async function handleSelection(context: InjectedContext) {
  console.log("selection", { context });
}

handleSelection(context);
