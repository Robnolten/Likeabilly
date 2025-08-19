import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Stars } from "@react-three/drei";
import { ErrorBoundary } from "./ErrorBoundary";
import FixedCloud from "./FixedCloud";
import { BoxWithOutline } from "./BoxWithOutline"; // Als je dit ook in een apart bestand zet

interface Boekenkast3DProps {
  height: number;
  width: number;
  depth: number;
  shelfPositions: number[];
  materialColor: string;
  kickboardY: number;
  topBoardY: number;
  activeShelf: number | null;
  verticalDividerPositions: number[];
  orbitRef: React.RefObject<any>;
}

const Boekenkast3D: React.FC<Boekenkast3DProps> = ({
  height,
  width,
  depth,
  shelfPositions,
  materialColor,
  kickboardY,
  topBoardY,
  activeShelf,
  verticalDividerPositions,
  orbitRef,
}) => {
  return (
    <ErrorBoundary>
      <Canvas
        shadows
        logarithmicDepthBuffer
        camera={{ position: [180, height * -2, height * 1.4], fov: 40 }}
      >
        <ambientLight intensity={2.1} />
        <directionalLight position={[5, 10, 5]} intensity={10} castShadow />
        <OrbitControls
          ref={orbitRef}
          enableZoom={true}
          minDistance={height * 1.8}
          maxDistance={height * 2.2}
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 2 - 0.087}
          maxPolarAngle={Math.PI / 2 + 0.087}
          minAzimuthAngle={-Math.PI / 2}
          maxAzimuthAngle={Math.PI / 2}
          enableDamping={true}
          dampingFactor={1.2}
        />
        <Environment preset="sunset" />
        <FixedCloud height={height} />
        <group renderOrder={-1}>
          <Stars
            radius={100}
            depth={50}
            count={3500}
            factor={10}
            saturation={0}
            fade={true}
            position={[0, 0, -500]}
          />
        </group>
        <group position={[0, height / 2 - height * 0.4, 0]}>
          <BoxWithOutline
            position={[0, 0, -depth / 2 - 0.5]}
            args={[width, height, 1]}
            color={materialColor}
          />
          <BoxWithOutline
            position={[-width / 2, 0, 0]}
            args={[1, height, depth]}
            color={materialColor}
          />
          <BoxWithOutline
            position={[width / 2, 0, 0]}
            args={[1, height, depth]}
            color={materialColor}
          />
          <BoxWithOutline
            position={[0, topBoardY, 0]}
            args={[width, 1, depth]}
            color={materialColor}
          />
          <BoxWithOutline
            position={[0, kickboardY, 0]}
            args={[width, 1, depth]}
            color={materialColor}
          />
          {shelfPositions.map((yPos, i) => (
            <BoxWithOutline
              key={`shelf-${i}`}
              position={[0, yPos, 0]}
              args={[width, 1, depth]}
              color={activeShelf === i ? "#edaed3" : materialColor}
            />
          ))}
          {verticalDividerPositions.map((x, i) => (
            <BoxWithOutline
              key={`divider-${i}`}
              position={[x, (topBoardY + kickboardY) / 2, 0]}
              args={[1, topBoardY - kickboardY, depth]}
              color={materialColor}
            />
          ))}
          <BoxWithOutline
            position={[0, kickboardY - 5, depth / 2 - 1.5]}
            args={[width - 2, 10, 1]}
            color={materialColor}
          />
        </group>
      </Canvas>
    </ErrorBoundary>
  );
};

export default Boekenkast3D;