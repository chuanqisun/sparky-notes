import type { OperatorNode } from "@symphony/types";

export function InspectorView(props: { operators: OperatorNode[] }) {
  return (
    <>
      {!props.operators.length && <div>Select stickies to inspect</div>}
      {props.operators.map((operator) => (
        <details class="inspector-item">
          <summary>{operator.name}</summary>
          <dl>
            <dt>Selected</dt>
            <dd>{JSON.stringify(operator.isSelected)}</dd>
            <dt>Config</dt>
            <dd>{JSON.stringify(operator.config, null, 2)}</dd>
            <dt>Data</dt>
            <dd>{JSON.stringify(operator.data, null, 2)}</dd>
          </dl>
        </details>
      ))}
    </>
  );
}
