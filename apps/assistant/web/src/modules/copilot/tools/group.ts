import { group } from "../../inference/group";
import type { FnCallProxy } from "../../openai/proxy";
import type { Tool } from "../tool";

export function groupTool(fnCallProxy: FnCallProxy): Tool {
  return {
    id: "core.group",
    displayName: "Group",
    parameters: [
      {
        displayName: "By",
        key: "by",
        hint: `Color, Texture, Sentiment, Concept`,
        isOptional: true,
      },
      {
        displayName: "Group names",
        key: "groupNames",
        hint: `Bug report, Feature request, Question`,
        isOptional: true,
      },
      {
        displayName: "Group count",
        key: "count",
        hint: `5, Up to three, >= 4`,
        isOptional: true,
      },
    ],
    run: async ({ args, shelf, setOutput }) => {
      const response = await group(fnCallProxy, args["by"], shelf);
      console.log(response);
      setOutput(response);
    },
  };
}
