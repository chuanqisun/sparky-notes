import type React from "react";
import { useState } from "react";
import styled from "styled-components";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { CenterClamp } from "../shell/center-clamp";
const db = new Cozo();
db.query("?[] <- [[1]]").then((res) => console.log(res.rows));

interface Cell {
  id: string;
  stepName: string;
  instruction: string;
  program: string;
}

export const BasicShelf: React.FC = () => {
  const { chat, ModelSelectorElement, embed } = useModelSelector();

  const [cells, setCells] = useState<Cell[]>([
    {
      id: crypto.randomUUID(),
      stepName: "A new step",
      instruction: "",
      program: "",
    },
  ]);

  const setStepName = (id: string, stepName: string) => {
    setCells((cells) => cells.map((cell) => (cell.id === id ? { ...cell, stepName } : cell)));
  };
  const setInput = (id: string, input: string) => {
    setCells((cells) => cells.map((cell) => (cell.id === id ? { ...cell, instruction: input } : cell)));
  };

  return (
    <AppLayout>
      <header>{ModelSelectorElement}</header>
      <CellList>
        {cells.map((cell) => (
          <CellItem>
            <Field>
              <label>Title</label>
              <input value={cell.stepName} onChange={(e) => setStepName(cell.id, e.target.value)} />
            </Field>
            <TwoColumns>
              <Field>
                <label>Task</label>
                <AutoResize data-resize-textarea-content={cell.instruction}>
                  <textarea value={cell.instruction} onChange={(e) => setInput(cell.id, e.target.value)} />
                </AutoResize>
                <button>Interpret</button>
              </Field>
              <Field>
                <label>Program</label>
                <AutoResize data-resize-textarea-content={cell.program}>
                  <textarea value={cell.program} onChange={(e) => setInput(cell.id, e.target.value)} />
                </AutoResize>
                <button>Run</button>
              </Field>
            </TwoColumns>
          </CellItem>
        ))}
      </CellList>
    </AppLayout>
  );
};

const AppLayout = styled(CenterClamp)`
  display: grid;
  gap: 2rem;
  width: 100%;
  align-content: start;
`;

const Field = styled.div`
  display: grid;
  gap: 2px;
`;

const CellList = styled.div`
  display: grid;
  gap: 2rem;
  align-content: start;
`;

const CellItem = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const TwoColumns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
`;
