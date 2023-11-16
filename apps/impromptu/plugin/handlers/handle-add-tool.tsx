import type { MessageFromUI } from "../../types/message";
import { AutoLayout, Text } from "../lib/figma-nodes";

export const handleAddTool = () => async (msg: MessageFromUI) => {
  if (msg.addTool) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={320}>
        <Text fill="#fff">{msg.addTool.displayName}</Text>
      </AutoLayout>
    )) as FrameNode;

    node.setPluginData("type", "tool");
    node.setPluginData("blob", msg.addTool.blob);
    figma.currentPage.appendChild(node);
    figma.currentPage.selection = [node];
  }
};
