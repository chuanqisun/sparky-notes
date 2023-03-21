import { TextField } from "./text-field";

const { Text, AutoLayout, Input } = figma.widget;

export function ProgramNode() {
  return (
    <AutoLayout direction="vertical" spacing={16} padding={24} cornerRadius={16} width={400} fill="#333">
      <TextField label="Input" value="How to conduct a literature review?" />
    </AutoLayout>
  );
}
