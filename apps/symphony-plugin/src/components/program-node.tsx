const { Text, AutoLayout, Input } = figma.widget;

export interface QuestionNodeProps {
  input: string;
}
export function QuestionNode(props: QuestionNodeProps) {
  return (
    <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} width={400} fill="#9747FF">
      <AutoLayout direction="vertical" spacing={8} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Question
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
    <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} width={400} fill="#0D99FF">
      <AutoLayout direction="vertical" spacing={8} width="fill-parent">
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
