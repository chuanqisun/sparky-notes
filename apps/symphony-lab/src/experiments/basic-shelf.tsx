import type React from "react";
import { useState } from "react";
import styled from "styled-components";
import { parse } from "yaml";
import { useModelSelector } from "../account/model-selector";
import { Cozo } from "../cozo/cozo";
import { AutoResize } from "../form/auto-resize";
import { createListProgram } from "../programs/create-list";
import { CenterClamp } from "../shell/center-clamp";

const db = new Cozo();
db.query("?[] <- [[1]]").then((res) => console.log(res.rows));

const programs = [createListProgram];
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

  const setCellField = (field: keyof Cell, id: string, value: string) => {
    setCells((cells) => cells.map((cell) => (cell.id === id ? { ...cell, [field]: value } : cell)));
  };

  const handleRun = async (id: string) => {
    const programText = cells.find((cell) => cell.id === id)?.program;

    // program format:
    // ```yaml
    // run: <program>
    // inputName1: ...
    // inputName2: ...
    //

    const data = parse(programText ?? "");
    if (!data.run) return;

    await programs.find((program) => program.name === (data.run as string))?.main({ db, data });
  };

  const handleRefresh = async () => {
    const relations = await db.listRelations();
    console.log(relations);
  };

  return (
    <AppLayout>
      <header>{ModelSelectorElement}</header>
      <CellList>
        {cells.map((cell) => (
          <CellItem key={cell.id}>
            <Field>
              <label>Title</label>
              <input value={cell.stepName} onChange={(e) => setCellField("stepName", cell.id, e.target.value)} />
            </Field>
            <TwoColumns>
              <Field>
                <label>Task</label>
                <AutoResize data-resize-textarea-content={cell.instruction}>
                  <textarea value={cell.instruction} onChange={(e) => setCellField("instruction", cell.id, e.target.value)} />
                </AutoResize>
                <button>Interpret</button>
              </Field>
              <Field>
                <label>Program</label>
                <MonospaceAutoResize data-resize-textarea-content={cell.program}>
                  <textarea spellCheck={false} value={cell.program} onChange={(e) => setCellField("program", cell.id, e.target.value)} />
                </MonospaceAutoResize>
                <button onClick={() => handleRun(cell.id)}>Run</button>
              </Field>
            </TwoColumns>
          </CellItem>
        ))}
        <Field>
          <label>Shelves</label>
          <button onClick={handleRefresh}>Refresh</button>
          <div>WIP</div>
        </Field>
      </CellList>
    </AppLayout>
  );
};

const MonospaceAutoResize = styled(AutoResize)`
  font-family: monospace;
`;

const AppLayout = styled(CenterClamp)`
  display: grid;
  gap: 2rem;
  width: 100%;
  align-content: start;
`;

const Field = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  grid-auto-flow: row;
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
