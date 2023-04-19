const { Text, AutoLayout, Input, Fragment } = figma.widget;

export interface DebugNodeProps {
  sourceCode: string;
}
export function DebugNode(props: DebugNodeProps) {
  return (
    <AutoLayout direction="vertical" spacing={8} padding={12} cornerRadius={12} width={400} fill="#0D99FF">
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Input
          inputBehavior="multiline"
          inputFrameProps={{ fill: "#fff", padding: 8, cornerRadius: 8 }}
          fill="#333"
          width="fill-parent"
          value={props.sourceCode}
          onTextEditEnd={() => {}}
        />
      </AutoLayout>
    </AutoLayout>
  );
}
