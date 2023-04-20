import jsonview from "@pgrabovets/json-view";
import type { OperatorNode } from "@symphony/types";
import { useEffect, useRef } from "preact/hooks";
import "./json-tree-patch.css";

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
            <JsonTree jsonString={operator.data} />
          </dl>
        </details>
      ))}
    </>
  );
}

function JsonTree(props: { jsonString: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      containerRef.current.innerHTML = "";
      const tree = jsonview.create(props.jsonString);
      jsonview.render(tree, containerRef.current);
    } catch {
      containerRef.current.innerHTML = `<dd>${JSON.stringify(props.jsonString, null, 2)}</dd>`;
    }
  }, [props.jsonString]);

  return <div ref={containerRef}></div>;
}
