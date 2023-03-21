const { Text, AutoLayout, Input } = figma.widget;

export interface DescriptionProps {
  children: string;
}
export function Description(props: DescriptionProps) {
  return (
    <Text fill="#ccc" fontSize={16} width={320}>
      {props.children}
    </Text>
  );
}
