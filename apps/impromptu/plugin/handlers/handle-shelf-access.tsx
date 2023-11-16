import type { MessageFromUI } from "../../types/message";
import { AutoLayout, Text } from "../lib/figma-nodes";
import { moveToViewCenter } from "../lib/mutation";

export const handleDataNodeAccess = () => async (msg: MessageFromUI) => {
  if (msg.createDataNode) {
    const node = (await figma.createNodeFromJSXAsync(
      <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333" width={320}>
        <Text fill="#fff">{msg.createDataNode.displayName}</Text>
      </AutoLayout>
    )) as FrameNode;

    node.setPluginData("type", "shelf");
    node.setPluginData("blob", msg.createDataNode.blob);
    figma.currentPage.appendChild(node);
    figma.currentPage.selection = [node];

    moveToViewCenter([node]);
  }
};
