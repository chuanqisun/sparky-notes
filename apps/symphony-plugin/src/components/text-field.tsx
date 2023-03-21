const { Text, AutoLayout, Input } = figma.widget;

export interface TextFieldProps {
  label: string;
  value: string;
}
export function TextField(props: TextFieldProps) {
  return (
    <AutoLayout direction="vertical" spacing={8}>
      <Text fill="#fff" fontSize={16}>
        {props.label}
      </Text>
      <Input
        inputBehavior="multiline"
        inputFrameProps={{ fill: "#fff", padding: 8, cornerRadius: 8 }}
        fill="#000"
        width={320}
        value={props.value}
        onTextEditEnd={() => {}}
      />
    </AutoLayout>
  );
}
