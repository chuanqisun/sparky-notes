import styled from "styled-components";

export interface TitleBarProps {
  isDebug: boolean;
  onSetDebug: (value: boolean) => void;
  maxTargetRef: React.RefObject<HTMLDivElement>;
  title: string;
  onRun: () => void;
  onClear: () => void;
}
export const TitleBar = (props: TitleBarProps) => {
  return (
    <DragBar>
      {props.title}
      <div>
        <button onClick={() => props.onSetDebug(!props.isDebug)}>Trace</button>
        <button onClick={() => props.maxTargetRef.current?.requestFullscreen()}>Max</button>
        <button onClick={props.onRun}>Run</button>
        <button onClick={props.onClear}>Clear</button>
      </div>
    </DragBar>
  );
};

const DragBar = styled.div`
  font-weight: 700;
  font-size: 12px;
  padding: 4px;
  color: var(--drag-bar-color);
  background-color: var(--drag-bar-background);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;
