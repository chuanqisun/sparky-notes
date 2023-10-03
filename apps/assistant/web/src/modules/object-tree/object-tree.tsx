import { useRef } from "preact/hooks";
import "./object-tree.css";

/** Render array as a list of <details><summary/><details/>, render object and <dl><dt><dd> */
export interface ObjectTreeProps {
  data?: any;
}

export function ObjectTree(props: ObjectTreeProps) {
  const rootDivRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={rootDivRef} class="c-object-viewer">
      <ObjectTreeNode data={props.data} level={0} />
    </div>
  );
}

function ObjectTreeNode({ data, level }: any) {
  if (typeof data !== "object") return <span>{data.toString()}</span>;
  if (data === null) return <span>null</span>;

  return (
    <>
      {Object.entries(data).map(([key, value], index) => (
        <>
          {isPrimitive(value) ? (
            <div key={index}>
              <span class="c-object-viewer__key">{key}</span>: <span class="c-object-viewer__value">{value as any}</span>
            </div>
          ) : (
            <details data-level={level} key={index}>
              <summary>{key}</summary>
              <div class="c-object-viewer__details">
                <ObjectTreeNode data={value} level={level + 1} />
              </div>
            </details>
          )}
        </>
      ))}
    </>
  );
}

function isPrimitive(data: any) {
  return typeof data !== "object" || data === null;
}
