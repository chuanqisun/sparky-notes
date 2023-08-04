const { Text, AutoLayout, Input } = figma.widget;

export interface FormTitleProps {
  children: string;
}

export function FormTitle(props: FormTitleProps) {
  return (
    <Text fill="#fff" fontSize={20} fontWeight="bold">
      {props.children}
    </Text>
  );
}
