const { Text, AutoLayout, Input, Fragment } = figma.widget;

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

export interface ActionNodeProps {
  input: string;
}
export function ActionNode(props: ActionNodeProps) {
  return (
    <AutoLayout direction="vertical" spacing={8} padding={12} cornerRadius={12} width={400} fill="#9747FF">
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Action
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

export interface ObservationNodeProps {
  input: string;
}
export function ObservationNode(props: ObservationNodeProps) {
  return (
    <AutoLayout direction="vertical" spacing={8} padding={12} cornerRadius={12} width={400} fill="#14AE5C">
      <AutoLayout direction="vertical" spacing={4} width="fill-parent">
        <Text fill="#fff" fontWeight={700} fontSize={16} width="fill-parent">
          Observation
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
