const { useEffect, Text, AutoLayout, Input, Fragment } = figma.widget;

export interface DebugNodeProps {
  name: string;
  config: string;
  data: string;
}
export function DebugNode(props: DebugNodeProps) {
  return (
    <AutoLayout direction="vertical" spacing={8} padding={12} cornerRadius={12} width={400} fill="#0D99FF">
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Name
        </Text>
        <Input
          inputBehavior="multiline"
          inputFrameProps={{ fill: "#fff", padding: 8, cornerRadius: 8 }}
          fill="#333"
          width="fill-parent"
          value={props.name}
          onTextEditEnd={() => {}}
        />
      </AutoLayout>
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Config
        </Text>
        <Input
          inputBehavior="multiline"
          inputFrameProps={{ fill: "#fff", padding: 8, cornerRadius: 8 }}
          fill="#333"
          width="fill-parent"
          value={props.config}
          onTextEditEnd={() => {}}
        />
      </AutoLayout>
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Log
        </Text>
        <Input
          inputBehavior="multiline"
          inputFrameProps={{ fill: "#333", padding: 8, cornerRadius: 8 }}
          fill="#fff"
          width="fill-parent"
          value={props.data}
          onTextEditEnd={() => {}}
        />
      </AutoLayout>
    </AutoLayout>
  );
}
