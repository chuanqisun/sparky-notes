import { convertFileByExtension } from "../../io/convert";
import { pickFiles } from "../../io/pick-files";
import type { Tool } from "../tool";

export function importTool(): Tool {
  return {
    id: "core.import",
    displayName: "Import",
    parameters: [],
    run: async ({ setOutput }) => {
      const [file] = await pickFiles({
        accept: "application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const converted = await convertFileByExtension(file);
      setOutput(converted);
    },
  };
}
