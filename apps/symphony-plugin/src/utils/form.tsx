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

export interface Field {
  label: TextNode;
  placeholder: TextNode;
  value: TextNode;
}
export function getFieldByLabel(label: string, parent: FrameNode): null | Field {
  const allTextNodes = parent.findAllWithCriteria({
    types: ["TEXT"],
  });

  const labelIndex = allTextNodes.findIndex((node) => node.characters === label);
  if (labelIndex === -1) {
    return null;
  }

  return {
    label: allTextNodes[labelIndex],
    placeholder: allTextNodes[labelIndex + 1],
    value: allTextNodes[labelIndex + 2],
  };
}

export function getTextByContent(content: string, parent: FrameNode): null | TextNode {
  return parent.findChild((node) => node.type === "TEXT" && node.characters === content) as TextNode | null;
}
