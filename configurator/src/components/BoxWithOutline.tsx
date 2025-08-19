import React, { useMemo } from "react";
import * as THREE from "three";

export const BoxWithOutline = ({
  position,
  args,
  color,
  highlight = false,
}: {
  position: [number, number, number];
  args: [number, number, number];
  color: string;
  highlight?: boolean;
}) => {
  const geometry = useMemo(() => new THREE.BoxGeometry(...args), [args]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);
  
  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color={color}
          emissive={highlight ? "#6366f1" : "#000000"}
          emissiveIntensity={highlight ? 0.5 : 0}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={highlight ? "#ffffff" : "#111"} />
      </lineSegments>
    </group>
  );
};