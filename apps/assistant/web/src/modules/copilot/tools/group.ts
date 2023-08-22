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
        isOptional: false,
      },
      // {
      //   displayName: "Group names",
      //   key: "groupNames",
      //   hint: `Bug report, Feature request, Question`,
      //   isOptional: true,
      // },
      // {
      //   displayName: "Group count",
      //   key: "count",
      //   hint: `5, Up to three, >= 4`,
      //   isOptional: true,
      // },
    ],
    run: async ({ args, shelf, update: updateShelf }) => {
      updateShelf((prev) => ({ ...prev, name: "Grouping..." }));
      const response = await group(fnCallProxy, { by: args["by"] }, shelf.data);
      await updateShelf((prev) => ({ ...prev, name: `${shelf.name} grouped`, data: response }));
    },
  };
}
