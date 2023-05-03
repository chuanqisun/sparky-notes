import type React from "react";
import ForceGraph3D from "react-force-graph-3d";

export const ThreeGraph: React.FC = () => {
  return (
    <div>
      <ForceGraph3D height={800} graphData={genRandomTree()} />
    </div>
  );
};

export default ThreeGraph;

function genRandomTree(N = 130, reverse = false) {
  return {
    nodes: [...Array(N).keys()].map((i) => ({ id: i })),
    links: [...Array(N).keys()]
      .filter((id) => id)
      .map((id) => ({
        [reverse ? "target" : "source"]: id,
        [reverse ? "source" : "target"]: Math.round(Math.random() * (id - 1)),
      })),
  };
}
