const { Text, AutoLayout, Input } = figma.widget;

export async function createProgramNode() {
  const node = (await figma.createNodeFromJSXAsync(
    <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} fill="#333">
      <Input
        inputBehavior="multiline"
        inputFrameProps={{ fill: "#fff", padding: 8, cornerRadius: 8 }}
        fill="#000"
        width={320}
        value={"How to conduct a literature review?"}
        onTextEditEnd={() => {}}
      />
    </AutoLayout>
  )) as FrameNode;

  return node;
}
