import type { OperatorNode } from "@symphony/types";
import type { RunContext } from "../../main";

export async function onRunFile(runContext: RunContext, operator: OperatorNode) {
  await new Promise<void>((resolve) => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.addEventListener("input", async (e) => {
      const maybeTextFile = fileInput.files?.[0];

      // TODO support CSV, Excel
      try {
        const fileContent = (await maybeTextFile?.text()) ?? "";
        runContext.figmaProxy.notify({
          setOperatorData: {
            id: operator.id,
            data: fileContent,
          },
        });
      } catch (e) {
        console.log(`Error decoding text file`, e);

        runContext.figmaProxy.notify({
          setOperatorData: {
            id: operator.id,
            data: "",
          },
        });
      } finally {
        resolve();
      }
    });

    fileInput.click();
  });
}
