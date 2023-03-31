const { Text, AutoLayout, Input } = figma.widget;

export interface ThoughtNodeProps {
  input: string;
}
export function ThoughtNode(props: ThoughtNodeProps) {
  return (
    <AutoLayout direction="vertical" spacing={8} padding={12} cornerRadius={12} width={400} fill="#0D99FF">
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Thought
        </Text>
        <Input
          inputBehavior="multiline"
          inputFrameProps={{ fill: "#fff", padding: 8, cornerRadius: 8 }}
          fill="#333"
          width="fill-parent"
          value={props.input}
          onTextEditEnd={() => {}}
        />
      </AutoLayout>
    </AutoLayout>
  );
}

export interface TaskNodeProps {
  input: string;
}
export function TaskNode(props: TaskNodeProps) {
  return (
    <AutoLayout direction="vertical" spacing={8} padding={12} cornerRadius={12} width={400} fill="#0D99FF">
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Task
        </Text>
        <Input
          inputBehavior="multiline"
          inputFrameProps={{ fill: "#fff", padding: 8, cornerRadius: 8 }}
          fill="#333"
          width="fill-parent"
          value={props.input}
          onTextEditEnd={() => {}}
        />
      </AutoLayout>
    </AutoLayout>
  );
}
