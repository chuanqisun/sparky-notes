import type React from "react";
import { useState } from "react";
import { AutoResize, BasicActionGroup, BasicForm, BasicFormField } from "../form/basic-form";
import { CenterClamp } from "../shell/center-clamp";
import { preventDefault } from "../utils/event";

export const Basic: React.FC = () => {
  const [queryValue, setQueryValue] = useState<string>("");

  return (
    <CenterClamp>
      <BasicForm onSubmit={preventDefault}>
        <BasicFormField>
          <label htmlFor="q">Query</label>
          <AutoResize data-resize-textarea-content={queryValue}>
            <textarea id="q" value={queryValue} onChange={(e) => setQueryValue(e.target.value)} />
          </AutoResize>
          <BasicActionGroup>
            <button onClick={() => {}}>Submit</button>
          </BasicActionGroup>
        </BasicFormField>
      </BasicForm>
    </CenterClamp>
  );
};
