import { OrbitControls, OrthographicCamera } from "@react-three/drei";
import { Canvas, type ThreeElements } from "@react-three/fiber";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import * as THREE from "three";

export interface DataPoint {
  x: number;
  y: number;
  z: number;
  label: string;
}

async function loadData() {
  const dataset: DataPoint[] = await fetch("/data/dbpedia-samples-stickies.json").then((res) => res.json());

  return dataset;
}

interface DataNodeProps {
  meshProps: ThreeElements["mesh"];
  onClick?: () => void;
  isActive?: boolean;
}
function DataNode(props: DataNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);

  return (
    <mesh {...props.meshProps} ref={meshRef} onClick={props.onClick} onPointerOver={(event) => setHover(true)} onPointerOut={(event) => setHover(false)}>
      {/* <boxGeometry args={[0.1, 0.1, 0.1]} /> */}
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshStandardMaterial color={props.isActive ? (hovered ? "hotpink" : "purple") : hovered ? "hotpink" : "orange"} />
    </mesh>
  );
}

const axisHelper = new THREE.AxesHelper(100);
// axisHelper.setColors(new THREE.Color("red"), new THREE.Color("purple"), new THREE.Color("white"));

export const VectorScope: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    loadData().then((data) => {
      setData(data);
    });
  }, []);

  console.log(data);

  const [activeItems, setActiveItems] = useState<DataPoint[]>([]); // [DataPoint, ...

  const toggleItem = (item: DataPoint) => {
    if (activeItems.some((i) => i === item)) {
      setActiveItems(activeItems.filter((i) => i !== item));
    } else {
      setActiveItems([...activeItems, item]);
    }
  };

  console.log(activeItems);

  //ref:https://docs.pmnd.rs/react-three-fiber/getting-started/introduction
  //ref: https://medium.com/cortico/3d-data-visualization-with-react-and-three-js-7272fb6de432

  return (
    <div>
      <WorkspaceGrid>
        <main className="viz">
          <Canvas>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            {data.map((d, i) => (
              <DataNode
                key={i}
                meshProps={{ position: [d.x * 10, d.y * 10, d.z * 10] }}
                onClick={() => toggleItem(data[i])}
                isActive={activeItems.some((i) => i === d)}
              />
            ))}
            <primitive object={axisHelper} />
            <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} />
            <OrbitControls makeDefault />.
          </Canvas>
        </main>
        <aside>
          <fieldset>
            <legend>Search</legend>
            <input type="search" onChange={() => {}} />
          </fieldset>
          <fieldset>
            <legend>Knowledge Cartographer</legend>
          </fieldset>
          <fieldset>
            <legend>Selection</legend>
            <ul>
              {activeItems.map((item, i) => (
                <li key={i}>{item.label}</li>
              ))}
            </ul>
          </fieldset>
        </aside>
      </WorkspaceGrid>
    </div>
  );
};

export default VectorScope;

const WorkspaceGrid = styled.div`
  --panelheight: calc(calc(100vh - 57px));
  display: grid;
  gap: 1px;
  grid-template: "main side" var(--panelheight) / 1fr 0.25fr;

  .viz {
    overflow: hidden;
    grid-area: main;
  }

  .side {
    grid-area: side;
  }
`;
