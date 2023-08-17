import "./object-tree.css";

/** Render array as a list of <details><summary/><details/>, render object and <dl><dt><dd> */
export interface ObjectTreeProps {
  data?: any;
}

export function ObjectTree(props: ObjectTreeProps) {
  return (
    <div class="c-object-viewer">
      <ObjectTreeNode data={props.data} />
    </div>
  );
}

function ObjectTreeNode({ data }: any) {
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
            <details key={index}>
              <summary>{key}</summary>
              <div class="c-object-viewer__details">
                <ObjectTreeNode data={value} />
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
